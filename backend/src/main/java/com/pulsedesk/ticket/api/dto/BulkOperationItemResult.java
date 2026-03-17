package com.pulsedesk.ticket.api.dto;

public record BulkOperationItemResult(
        Long ticketId,
        boolean success,
        String message
) {
}