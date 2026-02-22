package com.pulsedesk.ticket.service;

import com.pulsedesk.ticket.api.dto.TicketCreateRequest;
import com.pulsedesk.ticket.api.dto.TicketResponse;
import com.pulsedesk.ticket.api.dto.TicketUpdateRequest;
import com.pulsedesk.ticket.domain.Ticket;
import com.pulsedesk.ticket.domain.TicketPriority;
import com.pulsedesk.ticket.domain.TicketStatus;
import com.pulsedesk.ticket.exception.TicketNotFoundException;
import com.pulsedesk.ticket.exception.TicketTransitionInvalidException;
import com.pulsedesk.ticket.repo.TicketRepository;
import com.pulsedesk.ticket.repo.TicketSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@Transactional
public class TicketService {

    private final TicketRepository ticketRepository;

    public TicketService(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    public TicketResponse createTicket(TicketCreateRequest request) {
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

        return TicketResponse.from(ticketRepository.save(ticket));
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

    public TicketResponse updateTicket(Long id, TicketUpdateRequest request) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));

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

        Long newAssigneeId = ticket.getAssigneeId();
        if (request.getAssigneeId() != null) {
            newAssigneeId = request.getAssigneeId();
        }

        ticket.updateDetails(
                newTitle,
                newDescription,
                newPriority,
                newAssigneeId,
                now
        );

        return TicketResponse.from(ticketRepository.save(ticket));
    }

    public TicketResponse transitionTicket(Long id, TicketStatus targetStatus) {
        requireNonNull(targetStatus, "targetStatus is required");

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));

        TicketStatus current = ticket.getStatus();
        if (current == targetStatus) {
            return TicketResponse.from(ticket);
        }

        if (!isTransitionAllowed(current, targetStatus)) {
            throw new TicketTransitionInvalidException(id, targetStatus.name());
        }

        OffsetDateTime now = OffsetDateTime.now();
        ticket.setStatus(targetStatus);
        ticket.setUpdatedAt(now);

        if (targetStatus == TicketStatus.RESOLVED) {
            ticket.setResolvedAt(now);
        } else if (current == TicketStatus.RESOLVED && targetStatus == TicketStatus.IN_PROGRESS) {
            ticket.setResolvedAt(null);
        }

        return TicketResponse.from(ticketRepository.save(ticket));
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

    private void requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
    }

    private void requireNonNull(Object value, String message) {
        if (value == null) {
            throw new IllegalArgumentException(message);
        }
    }
}