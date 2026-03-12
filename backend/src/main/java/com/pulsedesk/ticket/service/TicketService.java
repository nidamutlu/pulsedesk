package com.pulsedesk.ticket.service;

import com.pulsedesk.security.AuthPrincipal;
import com.pulsedesk.ticket.api.dto.TicketRequest;
import com.pulsedesk.ticket.api.dto.TicketResponse;
import com.pulsedesk.ticket.domain.Ticket;
import com.pulsedesk.ticket.domain.TicketAuditLog;
import com.pulsedesk.ticket.domain.TicketPriority;
import com.pulsedesk.ticket.domain.TicketStatus;
import com.pulsedesk.ticket.exception.TicketNotFoundException;
import com.pulsedesk.ticket.exception.TicketTransitionInvalidException;
import com.pulsedesk.ticket.repository.TicketAuditLogRepository;
import com.pulsedesk.ticket.repository.TicketRepository;
import com.pulsedesk.ticket.repository.TicketSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@Transactional
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketAuditLogRepository auditLogRepository;

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

        return ticketRepository.findAll(spec, pageable)
                .map(TicketResponse::from);
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

        Long oldAssigneeId = ticket.getAssigneeId();
        Long newAssigneeId = oldAssigneeId;

        if (request.getAssigneeId() != null) {
            ensureCanAssign(currentUser);
            newAssigneeId = request.getAssigneeId();
            ticket.assignTo(newAssigneeId);
        }

        ticket.updateDetails(
                updatedTitle,
                updatedDescription,
                updatedPriority,
                now
        );

        Ticket saved = ticketRepository.save(ticket);

        if (!sameValue(oldAssigneeId, newAssigneeId)) {
            auditLogRepository.save(
                    TicketAuditLog.assigneeChange(
                            saved.getId(),
                            oldAssigneeId,
                            newAssigneeId,
                            currentUser.userId()
                    )
            );
        }

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

    private Ticket findTicketOrThrow(Long ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(ticketId));
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

            boolean requesterAllowed =
                    sourceStatus == TicketStatus.RESOLVED
                            && (targetStatus == TicketStatus.CLOSED
                            || targetStatus == TicketStatus.IN_PROGRESS);

            if (!requesterAllowed) {
                throw new AccessDeniedException("Requester cannot perform this transition");
            }

            return;
        }

        assertCanMutate(currentUser, ticket);
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

    private static boolean sameValue(Long left, Long right) {
        return left == null ? right == null : left.equals(right);
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