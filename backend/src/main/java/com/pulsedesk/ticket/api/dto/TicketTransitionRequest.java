package com.pulsedesk.ticket.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.pulsedesk.ticket.domain.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record TicketTransitionRequest(

        @NotNull
        @JsonProperty("toStatus")
        TicketStatus toStatus

) {}