package com.pulsedesk.ticket.api.dto;

import jakarta.validation.constraints.NotNull;

public record MarkNotificationReadRequest(
        @NotNull Long userId
) {}