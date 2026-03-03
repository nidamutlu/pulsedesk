package com.pulsedesk.notification.api.dto;

import jakarta.validation.constraints.NotNull;

public record MarkNotificationReadRequest(
        @NotNull Long userId
) {
}