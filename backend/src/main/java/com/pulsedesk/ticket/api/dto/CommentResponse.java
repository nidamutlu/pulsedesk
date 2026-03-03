package com.pulsedesk.ticket.api.dto;

import java.time.OffsetDateTime;

public record CommentResponse(
        Long id,
        Long ticketId,
        Long authorId,
        String body,
        OffsetDateTime createdAt
) {}