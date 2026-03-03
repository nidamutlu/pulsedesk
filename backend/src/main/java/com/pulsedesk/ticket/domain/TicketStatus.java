package com.pulsedesk.ticket.domain;

import java.util.EnumSet;
import java.util.Set;

public enum TicketStatus {

    OPEN,
    IN_PROGRESS,
    WAITING_CUSTOMER,
    RESOLVED,
    CLOSED;

    public Set<TicketStatus> allowedNext() {
        return switch (this) {
            case OPEN -> EnumSet.of(IN_PROGRESS);
            case IN_PROGRESS -> EnumSet.of(WAITING_CUSTOMER, RESOLVED);
            case WAITING_CUSTOMER -> EnumSet.of(IN_PROGRESS, RESOLVED);
            case RESOLVED -> EnumSet.of(CLOSED, IN_PROGRESS);
            case CLOSED -> EnumSet.noneOf(TicketStatus.class);
        };
    }

    public boolean canTransitionTo(TicketStatus next) {
        return allowedNext().contains(next);
    }
}