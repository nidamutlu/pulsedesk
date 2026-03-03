package com.pulsedesk.notification.api.dto;

import com.pulsedesk.notification.domain.NotificationType;

import java.time.OffsetDateTime;

public record NotificationResponse(
        Long id,
        Long userId,
        Long ticketId,
        Long commentId,
        NotificationType type,
        String message,
        OffsetDateTime createdAt,
        OffsetDateTime readAt
) {
}