package com.pulsedesk.ticket.api.dto;

import java.util.List;

public record BulkOperationResponse(
        int totalCount,
        int successCount,
        int failureCount,
        String message,
        List<BulkOperationItemResult> results
) {
}