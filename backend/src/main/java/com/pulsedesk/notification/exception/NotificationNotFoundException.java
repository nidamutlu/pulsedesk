package com.pulsedesk.notification.exception;

import lombok.Getter;

@Getter
public class NotificationNotFoundException extends RuntimeException {

    private final Long notificationId;

    public NotificationNotFoundException(Long notificationId) {
        super("Notification not found: " + notificationId);
        this.notificationId = notificationId;
    }
}