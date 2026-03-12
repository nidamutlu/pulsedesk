package com.pulsedesk.ticket.exception;

import lombok.Getter;

@Getter
public class TicketNotFoundException extends RuntimeException {

    private final Long ticketId;

    public TicketNotFoundException(Long ticketId) {
        super("Ticket not found");
        this.ticketId = ticketId;
    }
}