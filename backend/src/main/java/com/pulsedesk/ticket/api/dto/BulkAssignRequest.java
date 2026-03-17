package com.pulsedesk.ticket.api.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record BulkAssignRequest(

        @NotEmpty(message = "ticketIds must not be empty")
        List<@NotNull Long> ticketIds,

        @NotNull(message = "assigneeId must not be null")
        Long assigneeId

) {}