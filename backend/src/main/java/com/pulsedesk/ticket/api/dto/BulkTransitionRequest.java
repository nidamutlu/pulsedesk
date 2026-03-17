package com.pulsedesk.ticket.api.dto;

import com.pulsedesk.ticket.domain.TicketStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record BulkTransitionRequest(

        @NotEmpty(message = "ticketIds must not be empty")
        List<@NotNull Long> ticketIds,

        @NotNull(message = "status must not be null")
        TicketStatus status

) {}