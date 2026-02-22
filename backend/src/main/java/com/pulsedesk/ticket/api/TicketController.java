package com.pulsedesk.ticket.api;

import com.pulsedesk.ticket.api.dto.TicketCreateRequest;
import com.pulsedesk.ticket.api.dto.TicketResponse;
import com.pulsedesk.ticket.api.dto.TicketTransitionRequest;
import com.pulsedesk.ticket.api.dto.TicketUpdateRequest;
import com.pulsedesk.ticket.domain.TicketPriority;
import com.pulsedesk.ticket.domain.TicketStatus;
import com.pulsedesk.ticket.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;

import static org.springframework.format.annotation.DateTimeFormat.ISO;

/**
 * Ticket REST API
 * - Ticket CRUD operations
 * - Workflow-based status transitions
 */
@RestController
@RequestMapping("/tickets")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    /**
     * Create a new ticket
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketResponse createTicket(@Valid @RequestBody TicketCreateRequest request) {
        return ticketService.createTicket(request);
    }

    /**
     * List tickets with pagination and optional filters
     */
    @GetMapping
    public Page<TicketResponse> listTickets(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Long teamId,
            @RequestParam(required = false, name = "q") String query,
            @RequestParam(required = false)
            @DateTimeFormat(iso = ISO.DATE_TIME) OffsetDateTime createdFrom,
            @RequestParam(required = false)
            @DateTimeFormat(iso = ISO.DATE_TIME) OffsetDateTime createdTo,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ticketService.listTickets(
                status, priority, assigneeId, teamId, query, createdFrom, createdTo, pageable
        );
    }

    /**
     * Get ticket details by id
     */
    @GetMapping("/{id}")
    public TicketResponse getTicketById(@PathVariable Long id) {
        return ticketService.getTicketById(id);
    }

    /**
     * Partially update ticket fields (PATCH semantics)
     * Status updates are NOT allowed here.
     */
    @PatchMapping("/{id}")
    public TicketResponse updateTicket(
            @PathVariable Long id,
            @Valid @RequestBody TicketUpdateRequest request
    ) {
        return ticketService.updateTicket(id, request);
    }

    /**
     * Change ticket status via workflow transition
     * All status changes must go through this endpoint.
     */
    @PostMapping("/{id}/transition")
    public TicketResponse transitionTicket(
            @PathVariable Long id,
            @Valid @RequestBody TicketTransitionRequest request
    ) {
        return ticketService.transitionTicket(id, request.getTargetStatus());
    }
}