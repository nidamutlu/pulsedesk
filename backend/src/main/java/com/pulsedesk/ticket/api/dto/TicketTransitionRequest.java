package com.pulsedesk.ticket.api.dto;

import jakarta.validation.constraints.NotBlank;

public class TicketTransitionRequest {

    @NotBlank(message = "transition is required")
    private String transition;

    public TicketTransitionRequest() {
    }

    public String getTransition() {
        return transition;
    }

    public void setTransition(String transition) {
        this.transition = transition;
    }
}
