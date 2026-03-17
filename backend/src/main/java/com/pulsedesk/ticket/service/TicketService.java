package com.pulsedesk.ticket.service;

import com.pulsedesk.notification.repository.NotificationRepository;
import com.pulsedesk.security.AuthPrincipal;
import com.pulsedesk.ticket.api.dto.BulkAssignRequest;
import com.pulsedesk.ticket.api.dto.BulkOperationItemResult;
import com.pulsedesk.ticket.api.dto.BulkOperationResponse;
import com.pulsedesk.ticket.api.dto.BulkTransitionRequest;
import com.pulsedesk.ticket.api.dto.TicketRequest;
import com.pulsedesk.ticket.api.dto.TicketResponse;
import com.pulsedesk.ticket.domain.Ticket;
import com.pulsedesk.ticket.domain.TicketAuditLog;
import com.pulsedesk.ticket.domain.TicketPriority;
import com.pulsedesk.ticket.domain.TicketStatus;
import com.pulsedesk.ticket.exception.TicketNotFoundException;
import com.pulsedesk.ticket.exception.TicketTransitionInvalidException;
import com.pulsedesk.ticket.repository.CommentRepository;
import com.pulsedesk.ticket.repository.TicketAuditLogRepository;
import com.pulsedesk.ticket.repository.TicketRepository;
import com.pulsedesk.ticket.repository.TicketSpecifications;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class TicketService {

    private static final DateTimeFormatter CSV_DATE_FORMATTER = DateTimeFormatter.ISO_OFFSET_DATE_TIME;
    private static final String CSV_HEADER =
            "id,title,status,priority,requester,assignee,createdAt,updatedAt\n";

    private final TicketRepository ticketRepository;
    private final TicketAuditLogRepository auditLogRepository;
    private final CommentRepository commentRepository;
    private final NotificationRepository notificationRepository;

    public TicketResponse createTicket(AuthPrincipal currentUser, TicketRequest request) {
        requireAuthenticated(currentUser);
        validateCreateRequest(request);

        Long requestedTeamId = request.getTeamId();

        if (currentUser.isAgent()) {
            Long currentTeamId = requireAgentTeam(currentUser);
            if (!currentTeamId.equals(requestedTeamId)) {
                throw new AccessDeniedException("Agent cannot create tickets for another team");
            }
        }

        Ticket ticket = new Ticket(
                request.getTitle().trim(),
                request.getDescription().trim(),
                request.getPriority(),
                currentUser.userId(),
                requestedTeamId
        );

        OffsetDateTime now = OffsetDateTime.now();
        ticket.initializeTimestamps(now);

        if (request.getAssigneeId() != null) {
            ensureCanAssign(currentUser);
            ticket.assignTo(request.getAssigneeId());
        }

        Ticket saved = ticketRepository.save(ticket);
        return TicketResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<TicketResponse> listTickets(
            AuthPrincipal currentUser,
            TicketStatus status,
            TicketPriority priority,
            Long assigneeId,
            Long teamId,
            String query,
            OffsetDateTime createdFrom,
            OffsetDateTime createdTo,
            Pageable pageable
    ) {
        requireAuthenticated(currentUser);

        Specification<Ticket> spec = buildTicketListSpec(
                currentUser,
                status,
                priority,
                assigneeId,
                teamId,
                query,
                createdFrom,
                createdTo
        );

        return ticketRepository.findAll(spec, pageable)
                .map(TicketResponse::from);
    }

    @Transactional(readOnly = true)
    public String exportTicketsCsv(
            AuthPrincipal currentUser,
            TicketStatus status,
            TicketPriority priority,
            Long assigneeId,
            Long teamId,
            String query,
            OffsetDateTime createdFrom,
            OffsetDateTime createdTo,
            Pageable pageable
    ) {
        requireAuthenticated(currentUser);

        Specification<Ticket> spec = buildTicketListSpec(
                currentUser,
                status,
                priority,
                assigneeId,
                teamId,
                query,
                createdFrom,
                createdTo
        );

        Sort sort = (pageable != null && pageable.getSort().isSorted())
                ? pageable.getSort()
                : Sort.by(Sort.Direction.DESC, "createdAt");

        List<Ticket> tickets = ticketRepository.findAll(spec, sort);

        StringBuilder csv = new StringBuilder();
        csv.append(CSV_HEADER);

        for (Ticket ticket : tickets) {
            csv.append(toCsvRow(ticket));
        }

        return csv.toString();
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicketById(AuthPrincipal currentUser, Long ticketId) {
        requireAuthenticated(currentUser);

        Ticket ticket = findTicketOrThrow(ticketId);
        assertCanView(currentUser, ticket);

        return TicketResponse.from(ticket);
    }

    public TicketResponse updateTicket(AuthPrincipal currentUser, Long ticketId, TicketRequest request) {
        requireAuthenticated(currentUser);

        Ticket ticket = findTicketOrThrow(ticketId);
        assertCanMutate(currentUser, ticket);
        validateUpdateRequest(currentUser, ticket, request);

        String updatedTitle = resolveUpdatedTitle(ticket, request);
        String updatedDescription = resolveUpdatedDescription(ticket, request);
        TicketPriority updatedPriority = resolveUpdatedPriority(ticket, request);

        OffsetDateTime now = OffsetDateTime.now();

        if (request.getAssigneeId() != null) {
            applyAssignment(currentUser, ticket, request.getAssigneeId(), now);
        }

        ticket.updateDetails(
                updatedTitle,
                updatedDescription,
                updatedPriority,
                now
        );

        Ticket saved = ticketRepository.save(ticket);
        return TicketResponse.from(saved);
    }

    public TicketResponse transitionTicket(AuthPrincipal currentUser, Long ticketId, TicketStatus targetStatus) {
        requireAuthenticated(currentUser);
        requireNonNull(targetStatus, "toStatus is required");

        Ticket ticket = findTicketOrThrow(ticketId);
        TicketStatus sourceStatus = ticket.getStatus();

        if (sourceStatus == targetStatus) {
            return TicketResponse.from(ticket);
        }

        assertCanTransition(currentUser, ticket, sourceStatus, targetStatus);

        if (!sourceStatus.canTransitionTo(targetStatus)) {
            throw new TicketTransitionInvalidException(
                    ticketId,
                    sourceStatus.name() + " -> " + targetStatus.name()
            );
        }

        OffsetDateTime now = OffsetDateTime.now();

        if (sourceStatus == TicketStatus.RESOLVED && targetStatus == TicketStatus.IN_PROGRESS) {
            ticket.reopenFromResolved(now);
        } else if (targetStatus == TicketStatus.RESOLVED) {
            ticket.markResolved(now);
        } else {
            ticket.changeStatus(targetStatus, now);
        }

        Ticket saved = ticketRepository.save(ticket);

        auditLogRepository.save(
                TicketAuditLog.statusChange(
                        saved.getId(),
                        sourceStatus,
                        targetStatus,
                        currentUser.userId()
                )
        );

        return TicketResponse.from(saved);
    }

    public BulkOperationResponse bulkAssign(AuthPrincipal currentUser, BulkAssignRequest request) {
        requireAuthenticated(currentUser);
        requireNonNull(request, "request is required");
        requireNonNull(request.ticketIds(), "ticketIds is required");
        requireNonNull(request.assigneeId(), "assigneeId is required");

        log.info("Bulk assign requested by user {} for {} tickets",
                currentUser.userId(),
                request.ticketIds().size());

        List<BulkOperationItemResult> results = new ArrayList<>();
        int successCount = 0;

        List<Long> distinctTicketIds = request.ticketIds().stream()
                .distinct()
                .collect(Collectors.toList());

        for (Long ticketId : distinctTicketIds) {
            try {
                requireNonNull(ticketId, "ticketId is required");

                Ticket ticket = findTicketOrThrow(ticketId);
                applyAssignment(currentUser, ticket, request.assigneeId(), OffsetDateTime.now());
                ticketRepository.save(ticket);

                results.add(new BulkOperationItemResult(
                        ticketId,
                        true,
                        "Ticket assigned successfully"
                ));
                successCount++;
            } catch (RuntimeException ex) {
                results.add(new BulkOperationItemResult(
                        ticketId,
                        false,
                        safeMessage(ex)
                ));
            }
        }

        int failureCount = distinctTicketIds.size() - successCount;
        log.info("Bulk assign completed: {} success, {} failure", successCount, failureCount);

        return buildBulkOperationResponse(distinctTicketIds.size(), successCount, results);
    }

    public BulkOperationResponse bulkTransition(AuthPrincipal currentUser, BulkTransitionRequest request) {
        requireAuthenticated(currentUser);
        requireNonNull(request, "request is required");
        requireNonNull(request.ticketIds(), "ticketIds is required");
        requireNonNull(request.status(), "status is required");

        log.info("Bulk transition requested by user {} to status {} for {} tickets",
                currentUser.userId(),
                request.status(),
                request.ticketIds().size());

        List<BulkOperationItemResult> results = new ArrayList<>();
        int successCount = 0;

        List<Long> distinctTicketIds = request.ticketIds().stream()
                .distinct()
                .collect(Collectors.toList());

        for (Long ticketId : distinctTicketIds) {
            try {
                requireNonNull(ticketId, "ticketId is required");

                transitionTicket(currentUser, ticketId, request.status());

                results.add(new BulkOperationItemResult(
                        ticketId,
                        true,
                        "Ticket transitioned successfully"
                ));
                successCount++;
            } catch (RuntimeException ex) {
                results.add(new BulkOperationItemResult(
                        ticketId,
                        false,
                        safeMessage(ex)
                ));
            }
        }

        int failureCount = distinctTicketIds.size() - successCount;
        log.info("Bulk transition completed: {} success, {} failure", successCount, failureCount);

        return buildBulkOperationResponse(distinctTicketIds.size(), successCount, results);
    }

    public void deleteTicket(AuthPrincipal currentUser, Long ticketId) {
        requireAuthenticated(currentUser);

        if (!currentUser.isAdmin()) {
            throw new AccessDeniedException("Only admin can delete tickets");
        }

        Ticket ticket = findTicketOrThrow(ticketId);

        notificationRepository.deleteByTicket_Id(ticketId);
        commentRepository.deleteByTicket_Id(ticketId);
        ticketRepository.delete(ticket);
    }

    private Specification<Ticket> buildTicketListSpec(
            AuthPrincipal currentUser,
            TicketStatus status,
            TicketPriority priority,
            Long assigneeId,
            Long teamId,
            String query,
            OffsetDateTime createdFrom,
            OffsetDateTime createdTo
    ) {
        Specification<Ticket> spec = Specification
                .where(TicketSpecifications.hasStatus(status))
                .and(TicketSpecifications.hasPriority(priority))
                .and(TicketSpecifications.hasAssignee(assigneeId))
                .and(TicketSpecifications.queryText(query))
                .and(TicketSpecifications.createdBetween(createdFrom, createdTo));

        if (currentUser.isAdmin()) {
            spec = spec.and(TicketSpecifications.hasTeam(teamId));
        } else if (currentUser.isAgent()) {
            Long currentTeamId = requireAgentTeam(currentUser);

            if (teamId != null && !teamId.equals(currentTeamId)) {
                throw new AccessDeniedException("Agent cannot query another team");
            }

            spec = spec.and(TicketSpecifications.hasTeam(currentTeamId));
        } else {
            spec = spec.and(TicketSpecifications.hasRequester(currentUser.userId()));
        }

        return spec;
    }

    private static String toCsvRow(Ticket ticket) {
        return new StringBuilder()
                .append(csvValue(ticket.getId())).append(',')
                .append(csvValue(ticket.getTitle())).append(',')
                .append(csvValue(ticket.getStatus())).append(',')
                .append(csvValue(ticket.getPriority())).append(',')
                .append(csvValue(ticket.getRequesterId())).append(',')
                .append(csvValue(ticket.getAssigneeId())).append(',')
                .append(csvValue(formatDate(ticket.getCreatedAt()))).append(',')
                .append(csvValue(formatDate(ticket.getUpdatedAt())))
                .append('\n')
                .toString();
    }

    private Ticket findTicketOrThrow(Long ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(ticketId));
    }

    private void applyAssignment(
            AuthPrincipal currentUser,
            Ticket ticket,
            Long assigneeId,
            OffsetDateTime now
    ) {
        assertCanMutate(currentUser, ticket);
        ensureCanAssign(currentUser);

        Long oldAssigneeId = ticket.getAssigneeId();

        if (sameValue(oldAssigneeId, assigneeId)) {
            return;
        }

        ticket.assignTo(assigneeId);
        ticket.touch(now);

        auditLogRepository.save(
                TicketAuditLog.assigneeChange(
                        ticket.getId(),
                        oldAssigneeId,
                        assigneeId,
                        currentUser.userId()
                )
        );
    }

    private BulkOperationResponse buildBulkOperationResponse(
            int totalCount,
            int successCount,
            List<BulkOperationItemResult> results
    ) {
        int failureCount = totalCount - successCount;
        String message = successCount + " tickets processed successfully, "
                + failureCount + " failed";

        return new BulkOperationResponse(
                totalCount,
                successCount,
                failureCount,
                message,
                results
        );
    }

    private void validateCreateRequest(TicketRequest request) {
        requireNonBlank(request.getTitle(), "title is required");
        requireNonBlank(request.getDescription(), "description is required");
        requireNonNull(request.getPriority(), "priority is required");
        requireNonNull(request.getTeamId(), "teamId is required");
    }

    private void validateUpdateRequest(AuthPrincipal currentUser, Ticket ticket, TicketRequest request) {
        if (request.getTeamId() != null && !request.getTeamId().equals(ticket.getTeamId())) {
            throw new IllegalArgumentException("teamId cannot be changed");
        }

        if (currentUser.isRequester() && request.getAssigneeId() != null) {
            throw new AccessDeniedException("Requester cannot assign tickets");
        }
    }

    private void assertCanTransition(
            AuthPrincipal currentUser,
            Ticket ticket,
            TicketStatus sourceStatus,
            TicketStatus targetStatus
    ) {
        if (currentUser.isRequester()) {
            assertCanView(currentUser, ticket);

            if (!isRequesterTransitionAllowed(sourceStatus, targetStatus)) {
                throw new AccessDeniedException("Requester cannot perform this transition");
            }

            return;
        }

        assertCanMutate(currentUser, ticket);
    }

    private static boolean isRequesterTransitionAllowed(
            TicketStatus sourceStatus,
            TicketStatus targetStatus
    ) {
        return sourceStatus == TicketStatus.RESOLVED
                && (targetStatus == TicketStatus.CLOSED
                || targetStatus == TicketStatus.IN_PROGRESS);
    }

    private static void assertCanView(AuthPrincipal currentUser, Ticket ticket) {
        if (currentUser.isAdmin()) {
            return;
        }

        if (currentUser.isAgent()) {
            if (currentUser.teamId() == null
                    || ticket.getTeamId() == null
                    || !currentUser.teamId().equals(ticket.getTeamId())) {
                throw new AccessDeniedException("Agent cannot access tickets outside the team");
            }
            return;
        }

        if (ticket.getRequesterId() == null || !currentUser.userId().equals(ticket.getRequesterId())) {
            throw new AccessDeniedException("Requester can only access own tickets");
        }
    }

    private static void assertCanMutate(AuthPrincipal currentUser, Ticket ticket) {
        assertCanView(currentUser, ticket);

        if (currentUser.isAdmin() || currentUser.isAgent()) {
            return;
        }

        throw new AccessDeniedException("Requester cannot update ticket details");
    }

    private static void ensureCanAssign(AuthPrincipal currentUser) {
        if (!currentUser.isAdmin() && !currentUser.isAgent()) {
            throw new AccessDeniedException("Requester cannot assign tickets");
        }
    }

    private static Long requireAgentTeam(AuthPrincipal currentUser) {
        if (currentUser.teamId() == null) {
            throw new AccessDeniedException("Agent has no team");
        }
        return currentUser.teamId();
    }

    private static String resolveUpdatedTitle(Ticket ticket, TicketRequest request) {
        if (request.getTitle() == null) {
            return ticket.getTitle();
        }

        requireNonBlank(request.getTitle(), "title must not be blank");
        return request.getTitle().trim();
    }

    private static String resolveUpdatedDescription(Ticket ticket, TicketRequest request) {
        if (request.getDescription() == null) {
            return ticket.getDescription();
        }

        requireNonBlank(request.getDescription(), "description must not be blank");
        return request.getDescription().trim();
    }

    private static TicketPriority resolveUpdatedPriority(Ticket ticket, TicketRequest request) {
        return request.getPriority() != null ? request.getPriority() : ticket.getPriority();
    }

    private static String formatDate(OffsetDateTime value) {
        return value != null ? CSV_DATE_FORMATTER.format(value) : "";
    }

    private static String csvValue(Object value) {
        if (value == null) {
            return "";
        }

        String text = String.valueOf(value);
        String escaped = text.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }

    private static boolean sameValue(Long left, Long right) {
        return left == null ? right == null : left.equals(right);
    }

    private static String safeMessage(RuntimeException ex) {
        return ex.getMessage() != null && !ex.getMessage().isBlank()
                ? ex.getMessage()
                : ex.getClass().getSimpleName();
    }

    private static void requireAuthenticated(AuthPrincipal currentUser) {
        if (currentUser == null || currentUser.userId() == null) {
            throw new AccessDeniedException("Unauthenticated");
        }
    }

    private static void requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
    }

    private static void requireNonNull(Object value, String message) {
        if (value == null) {
            throw new IllegalArgumentException(message);
        }
    }
}