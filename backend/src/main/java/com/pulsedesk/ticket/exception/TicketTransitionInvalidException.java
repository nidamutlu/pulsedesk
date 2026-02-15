package com.pulsedesk.ticket.exception;

public class TicketTransitionInvalidException extends RuntimeException {

    private final Long ticketId;
    private final String transition;

    public TicketTransitionInvalidException(Long ticketId, String transition) {
        super("Invalid transition: " + transition);
        this.ticketId = ticketId;
        this.transition = transition;
    }

    public Long getTicketId() {
        return ticketId;
    }

    public String getTransition() {
        return transition;
    }
}