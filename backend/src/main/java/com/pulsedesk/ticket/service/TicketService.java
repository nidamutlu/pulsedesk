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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Locale;

@Service
@Transactional
public class TicketService {

    private final TicketRepository ticketRepository;

    public TicketService(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    // Create ticket with initial OPEN status
    public TicketResponse createTicket(TicketCreateRequest request) {
        requireNonBlank(request.getTitle(), "title is required");
        requireNonBlank(request.getDescription(), "description is required");
        requireNonBlank(request.getPriority(), "priority is required");

        TicketPriority priority = parsePriority(request.getPriority());

        Ticket ticket = new Ticket(
                request.getTitle().trim(),
                request.getDescription().trim(),
                priority,
                request.getRequesterId(),
                request.getTeamId()
        );

        OffsetDateTime now = OffsetDateTime.now();
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setCreatedAt(now);
        ticket.setUpdatedAt(now);
        ticket.setResolvedAt(null);

        return TicketResponse.from(ticketRepository.save(ticket));
    }

    // List tickets (paged)
    @Transactional(readOnly = true)
    public Page<TicketResponse> listTickets(Pageable pageable) {
        return ticketRepository.findAll(pageable)
                .map(TicketResponse::from);
    }

    // Get ticket by id
    @Transactional(readOnly = true)
    public TicketResponse getTicketById(Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));
        return TicketResponse.from(ticket);
    }

    // Update ticket fields (status is NOT updated here)
    public TicketResponse updateTicket(Long id, TicketUpdateRequest request) {
        requireNonBlank(request.getTitle(), "title is required");
        requireNonBlank(request.getDescription(), "description is required");
        requireNonBlank(request.getPriority(), "priority is required");

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));

        TicketPriority priority = parsePriority(request.getPriority());
        OffsetDateTime now = OffsetDateTime.now();

        ticket.updateDetails(
                request.getTitle().trim(),
                request.getDescription().trim(),
                priority,
                request.getAssigneeId(),
                now
        );

        return TicketResponse.from(ticketRepository.save(ticket));
    }

    // Apply workflow-based status transition
    public TicketResponse transitionTicket(Long id, String transition) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));

        TicketStatus currentStatus = ticket.getStatus();
        TicketStatus targetStatus = parseStatusOrThrow(id, transition);

        if (currentStatus == targetStatus) {
            return TicketResponse.from(ticket);
        }

        if (!isTransitionAllowed(currentStatus, targetStatus)) {
            throw new TicketTransitionInvalidException(id, transition);
        }

        OffsetDateTime now = OffsetDateTime.now();
        ticket.setStatus(targetStatus);
        ticket.setUpdatedAt(now);

        if (targetStatus == TicketStatus.RESOLVED) {
            ticket.setResolvedAt(now);
        } else if (currentStatus == TicketStatus.RESOLVED) {
            ticket.setResolvedAt(null);
        }

        return TicketResponse.from(ticketRepository.save(ticket));
    }

    // Workflow rules
    private boolean isTransitionAllowed(TicketStatus from, TicketStatus to) {
        return switch (from) {
            case OPEN -> to == TicketStatus.IN_PROGRESS;
            case IN_PROGRESS -> to == TicketStatus.WAITING_CUSTOMER || to == TicketStatus.RESOLVED;
            case WAITING_CUSTOMER -> to == TicketStatus.IN_PROGRESS || to == TicketStatus.RESOLVED;
            case RESOLVED -> to == TicketStatus.CLOSED || to == TicketStatus.IN_PROGRESS;
            case CLOSED -> false;
        };
    }

    private TicketPriority parsePriority(String raw) {
        try {
            return TicketPriority.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            throw new IllegalArgumentException("priority must be one of: LOW, MEDIUM, HIGH");
        }
    }

    private TicketStatus parseStatusOrThrow(Long ticketId, String raw) {
        try {
            return TicketStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            throw new TicketTransitionInvalidException(ticketId, raw);
        }
    }

    private void requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
    }
}
