package com.pulsedesk.ticket.api;

import com.pulsedesk.ticket.api.dto.TicketCreateRequest;
import com.pulsedesk.ticket.api.dto.TicketResponse;
import com.pulsedesk.ticket.api.dto.TicketTransitionRequest;
import com.pulsedesk.ticket.api.dto.TicketUpdateRequest;
import com.pulsedesk.ticket.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/tickets")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    // POST /tickets
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketResponse createTicket(@Valid @RequestBody TicketCreateRequest request) {
        return ticketService.createTicket(request);
    }

    // GET /tickets (pagination)
    @GetMapping
    public Page<TicketResponse> listTickets(Pageable pageable) {
        return ticketService.listTickets(pageable);
    }

    // GET /tickets/{id}
    @GetMapping("/{id}")
    public TicketResponse getTicketById(@PathVariable Long id) {
        return ticketService.getTicketById(id);
    }

    // PUT /tickets/{id}
    @PutMapping("/{id}")
    public TicketResponse updateTicket(@PathVariable Long id,
                                       @Valid @RequestBody TicketUpdateRequest request) {
        return ticketService.updateTicket(id, request);
    }

    // PUT /tickets/{id}/transition
    @PutMapping("/{id}/transition")
    public TicketResponse transitionTicket(@PathVariable Long id,
                                           @Valid @RequestBody TicketTransitionRequest request) {
        return ticketService.transitionTicket(id, request.getTransition());
    }
}
