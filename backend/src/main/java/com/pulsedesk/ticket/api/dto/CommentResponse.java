package com.pulsedesk.ticket.api.dto;

import com.pulsedesk.ticket.domain.Comment;

import java.time.OffsetDateTime;

public record CommentResponse(
        Long id,
        Long ticketId,
        Long authorId,
        String body,
        OffsetDateTime createdAt
) {

    public static CommentResponse from(Comment comment) {
        return new CommentResponse(
                comment.getId(),
                comment.getTicket().getId(),
                comment.getAuthorId(),
                comment.getBody(),
                comment.getCreatedAt()
        );
    }
}