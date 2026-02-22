package com.pulsedesk.ticket.api.dto;

import com.pulsedesk.ticket.domain.TicketStatus;
import jakarta.validation.constraints.NotNull;

public class TicketTransitionRequest {

    @NotNull(message = "targetStatus is required")
    private TicketStatus targetStatus;

    public TicketStatus getTargetStatus() {
        return targetStatus;
    }

    public void setTargetStatus(TicketStatus targetStatus) {
        this.targetStatus = targetStatus;
    }
}