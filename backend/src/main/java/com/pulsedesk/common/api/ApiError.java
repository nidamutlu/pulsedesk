package com.pulsedesk.ticket.api;

public record ApiError(
        String code,
        String message,
        Object details
) {}
