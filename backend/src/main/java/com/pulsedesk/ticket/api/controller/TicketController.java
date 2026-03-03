package com.pulsedesk.ticket.api.controller;

import com.pulsedesk.ticket.api.dto.TicketAuditLogResponse;
import com.pulsedesk.ticket.api.dto.TicketRequest;
import com.pulsedesk.ticket.api.dto.TicketResponse;
import com.pulsedesk.ticket.api.dto.TicketTransitionRequest;
import com.pulsedesk.ticket.domain.TicketPriority;
import com.pulsedesk.ticket.domain.TicketStatus;
import com.pulsedesk.ticket.service.TicketAuditService;
import com.pulsedesk.ticket.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

import static org.springframework.format.annotation.DateTimeFormat.ISO;

@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;
    private final TicketAuditService ticketAuditService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketResponse createTicket(@Valid @RequestBody TicketRequest request) {
        return ticketService.createTicket(request);
    }

    @GetMapping
    public Page<TicketResponse> listTickets(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Long teamId,
            @RequestParam(required = false, name = "q") String query,
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE_TIME) OffsetDateTime createdFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = ISO.DATE_TIME) OffsetDateTime createdTo,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ticketService.listTickets(
                status, priority, assigneeId, teamId, query, createdFrom, createdTo, pageable
        );
    }

    @GetMapping("/{id}")
    public TicketResponse getTicketById(@PathVariable Long id) {
        return ticketService.getTicketById(id);
    }

    @PatchMapping("/{id}")
    public TicketResponse updateTicket(@PathVariable Long id, @Valid @RequestBody TicketRequest request) {
        if (request.getStatus() != null) {
            throw new IllegalArgumentException(
                    "Status cannot be updated via PATCH. Use /tickets/{id}/transition."
            );
        }
        return ticketService.updateTicket(id, request);
    }

    @PostMapping("/{id}/transition")
    public TicketResponse transitionTicket(
            @PathVariable Long id,
            @Valid @RequestBody TicketTransitionRequest request
    ) {
        return ticketService.transitionTicket(id, request.toStatus());
    }

    @GetMapping("/{id}/audit-logs")
    public List<TicketAuditLogResponse> listAuditLogs(@PathVariable Long id) {
        return ticketAuditService.listAuditLogs(id);
    }
}