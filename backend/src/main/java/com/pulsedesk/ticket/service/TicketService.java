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

    public TicketResponse createTicket(AuthPrincipal me, TicketRequest request) {
        requireAuth(me);

        requireNonBlank(request.getTitle(), "title is required");
        requireNonBlank(request.getDescription(), "description is required");
        requireNonNull(request.getPriority(), "priority is required");
        requireNonNull(request.getTeamId(), "teamId is required");

        Long requesterId = me.userId();

        Ticket ticket = new Ticket(
                request.getTitle().trim(),
                request.getDescription().trim(),
                request.getPriority(),
                requesterId,
                request.getTeamId()
        );

        OffsetDateTime now = OffsetDateTime.now();
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setCreatedAt(now);
        ticket.setUpdatedAt(now);

        if (request.getAssigneeId() != null) {
            if (!me.isAdmin() && !me.isAgent()) {
                throw new AccessDeniedException("Requester cannot set assignee");
            }
            ticket.setAssigneeId(request.getAssigneeId());
        }

        if (me.isAgent() && me.teamId() != null && !me.teamId().equals(request.getTeamId())) {
            throw new AccessDeniedException("Agent cannot create ticket for another team");
        }

        Ticket saved = ticketRepository.save(ticket);
        return TicketResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<TicketResponse> listTickets(
            AuthPrincipal me,
            TicketStatus status,
            TicketPriority priority,
            Long assigneeId,
            Long teamId,
            String q,
            OffsetDateTime createdFrom,
            OffsetDateTime createdTo,
            Pageable pageable
    ) {
        requireAuth(me);

        Specification<Ticket> spec = Specification
                .where(TicketSpecifications.hasStatus(status))
                .and(TicketSpecifications.hasPriority(priority))
                .and(TicketSpecifications.hasAssignee(assigneeId))
                .and(TicketSpecifications.queryText(q))
                .and(TicketSpecifications.createdBetween(createdFrom, createdTo));

        if (me.isAdmin()) {
            spec = spec.and(TicketSpecifications.hasTeam(teamId));
        } else if (me.isAgent()) {
            if (me.teamId() == null) throw new AccessDeniedException("Agent has no team");
            spec = spec.and(TicketSpecifications.hasTeam(me.teamId()));
        } else {
            spec = spec.and(TicketSpecifications.hasRequester(me.userId()));
        }

        return ticketRepository.findAll(spec, pageable).map(TicketResponse::from);
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicketById(AuthPrincipal me, Long id) {
        requireAuth(me);

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));

        assertCanView(me, ticket);

        return TicketResponse.from(ticket);
    }

    public TicketResponse updateTicket(AuthPrincipal me, Long id, TicketRequest request) {
        requireAuth(me);

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));

        assertCanMutate(me, ticket);

        if (request.getStatus() != null) {
            throw new IllegalArgumentException(
                    "Status updates are not allowed via PATCH. Use /tickets/{id}/transition."
            );
        }

        OffsetDateTime now = OffsetDateTime.now();

        String newTitle = ticket.getTitle();
        if (request.getTitle() != null) {
            requireNonBlank(request.getTitle(), "title must not be blank");
            newTitle = request.getTitle().trim();
        }

        String newDescription = ticket.getDescription();
        if (request.getDescription() != null) {
            requireNonBlank(request.getDescription(), "description must not be blank");
            newDescription = request.getDescription().trim();
        }

        TicketPriority newPriority = ticket.getPriority();
        if (request.getPriority() != null) {
            newPriority = request.getPriority();
        }

        Long oldAssigneeId = ticket.getAssigneeId();
        Long newAssigneeId = oldAssigneeId;
        if (request.getAssigneeId() != null) {
            newAssigneeId = request.getAssigneeId();
            ticket.setAssigneeId(newAssigneeId);
        }

        ticket.updateDetails(
                newTitle,
                newDescription,
                newPriority,
                ticket.getAssigneeId(),
                now
        );

        Ticket saved = ticketRepository.save(ticket);

        if (oldAssigneeId == null ? newAssigneeId != null : !oldAssigneeId.equals(newAssigneeId)) {
            auditLogRepository.save(
                    TicketAuditLog.assigneeChange(saved.getId(), oldAssigneeId, newAssigneeId, me.userId())
            );
        }

        return TicketResponse.from(saved);
    }

    public TicketResponse transitionTicket(AuthPrincipal me, Long id, TicketStatus targetStatus) {
        requireAuth(me);
        requireNonNull(targetStatus, "toStatus is required");

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));

        TicketStatus from = ticket.getStatus();
        if (from == targetStatus) {
            return TicketResponse.from(ticket);
        }

        if (me.isRequester()) {
            assertCanView(me, ticket);

            boolean allowed = (from == TicketStatus.RESOLVED) &&
                    (targetStatus == TicketStatus.CLOSED || targetStatus == TicketStatus.IN_PROGRESS);

            if (!allowed) {
                throw new AccessDeniedException("Requester cannot perform this transition");
            }
        } else {
            assertCanMutate(me, ticket);
        }

        if (!isTransitionAllowed(from, targetStatus)) {
            throw new TicketTransitionInvalidException(
                    id,
                    from.name() + " -> " + targetStatus.name()
            );
        }

        OffsetDateTime now = OffsetDateTime.now();
        ticket.setStatus(targetStatus);
        ticket.setUpdatedAt(now);

        if (targetStatus == TicketStatus.RESOLVED) {
            ticket.setResolvedAt(now);
        } else if (from == TicketStatus.RESOLVED && targetStatus == TicketStatus.IN_PROGRESS) {
            ticket.setResolvedAt(null);
        }

        Ticket saved = ticketRepository.save(ticket);

        auditLogRepository.save(
                TicketAuditLog.statusChange(saved.getId(), from, targetStatus, me.userId())
        );

        return TicketResponse.from(saved);
    }

    private static void requireAuth(AuthPrincipal me) {
        if (me == null || me.userId() == null) {
            throw new AccessDeniedException("Unauthenticated");
        }
    }

    private static void assertCanView(AuthPrincipal me, Ticket t) {
        if (me.isAdmin()) return;

        if (me.isAgent()) {
            if (me.teamId() == null || t.getTeamId() == null || !me.teamId().equals(t.getTeamId())) {
                throw new AccessDeniedException("Not in same team");
            }
            return;
        }

        if (t.getRequesterId() == null || !me.userId().equals(t.getRequesterId())) {
            throw new AccessDeniedException("Not owner");
        }
    }

    private static void assertCanMutate(AuthPrincipal me, Ticket t) {
        assertCanView(me, t);

        if (me.isAdmin()) return;
        if (me.isAgent()) return;

        throw new AccessDeniedException("Requester cannot mutate ticket");
    }

    private boolean isTransitionAllowed(TicketStatus from, TicketStatus to) {
        return switch (from) {
            case OPEN -> to == TicketStatus.IN_PROGRESS;
            case IN_PROGRESS -> to == TicketStatus.WAITING_CUSTOMER || to == TicketStatus.RESOLVED;
            case WAITING_CUSTOMER -> to == TicketStatus.IN_PROGRESS || to == TicketStatus.RESOLVED;
            case RESOLVED -> to == TicketStatus.CLOSED || to == TicketStatus.IN_PROGRESS;
            case CLOSED -> false;
        };
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