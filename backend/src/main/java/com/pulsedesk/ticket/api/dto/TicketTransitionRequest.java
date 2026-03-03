package com.pulsedesk.ticket.api.dto;

import com.pulsedesk.ticket.domain.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record TicketTransitionRequest(
        @NotNull TicketStatus toStatus
) {}