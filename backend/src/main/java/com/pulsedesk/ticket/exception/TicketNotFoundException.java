package com.pulsedesk.ticket.exception;

public class TicketNotFoundException extends RuntimeException {

    private final Long ticketId;

    public TicketNotFoundException(Long ticketId) {
        super("Ticket not found: " + ticketId);
        this.ticketId = ticketId;
    }

    public Long getTicketId() {
        return ticketId;
    }
}
