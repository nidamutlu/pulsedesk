package com.pulsedesk.ticket.service;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@Transactional
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketAuditLogRepository auditLogRepository;

    public TicketResponse createTicket(TicketRequest request) {
        requireNonBlank(request.getTitle(), "title is required");
        requireNonBlank(request.getDescription(), "description is required");
        requireNonNull(request.getPriority(), "priority is required");
        requireNonNull(request.getRequesterId(), "requesterId is required");
        requireNonNull(request.getTeamId(), "teamId is required");

        Ticket ticket = new Ticket(
                request.getTitle().trim(),
                request.getDescription().trim(),
                request.getPriority(),
                request.getRequesterId(),
                request.getTeamId()
        );

        OffsetDateTime now = OffsetDateTime.now();
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setCreatedAt(now);
        ticket.setUpdatedAt(now);

        if (request.getAssigneeId() != null) {
            ticket.setAssigneeId(request.getAssigneeId());
        }

        Ticket saved = ticketRepository.save(ticket);
        return TicketResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<TicketResponse> listTickets(
            TicketStatus status,
            TicketPriority priority,
            Long assigneeId,
            Long teamId,
            String q,
            OffsetDateTime createdFrom,
            OffsetDateTime createdTo,
            Pageable pageable
    ) {
        Specification<Ticket> spec = Specification
                .where(TicketSpecifications.hasStatus(status))
                .and(TicketSpecifications.hasPriority(priority))
                .and(TicketSpecifications.hasAssignee(assigneeId))
                .and(TicketSpecifications.hasTeam(teamId))
                .and(TicketSpecifications.queryText(q))
                .and(TicketSpecifications.createdBetween(createdFrom, createdTo));

        return ticketRepository.findAll(spec, pageable).map(TicketResponse::from);
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicketById(Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));
        return TicketResponse.from(ticket);
    }

    public TicketResponse updateTicket(Long id, TicketRequest request) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));

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

        return TicketResponse.from(saved);
    }

    public TicketResponse transitionTicket(Long id, TicketStatus targetStatus) {
        requireNonNull(targetStatus, "toStatus is required");

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));

        TicketStatus from = ticket.getStatus();
        if (from == targetStatus) {
            return TicketResponse.from(ticket);
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
        } else if (from == TicketStatus.RESOLVED) {
            ticket.setResolvedAt(null);
        }

        Ticket saved = ticketRepository.save(ticket);

        auditLogRepository.save(TicketAuditLog.statusChange(saved.getId(), from, targetStatus, 1L));

        return TicketResponse.from(saved);
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