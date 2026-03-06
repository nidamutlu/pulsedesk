package com.pulsedesk.ticket.service;

import com.pulsedesk.notification.service.NotificationService;
import com.pulsedesk.ticket.api.dto.CommentCreateRequest;
import com.pulsedesk.ticket.api.dto.CommentResponse;
import com.pulsedesk.ticket.domain.Comment;
import com.pulsedesk.ticket.domain.Ticket;
import com.pulsedesk.ticket.exception.TicketNotFoundException;
import com.pulsedesk.ticket.repository.CommentRepository;
import com.pulsedesk.ticket.repository.TicketRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class CommentService {

    private final TicketRepository ticketRepository;
    private final CommentRepository commentRepository;
    private final NotificationService notificationService;

    public CommentService(
            TicketRepository ticketRepository,
            CommentRepository commentRepository,
            NotificationService notificationService
    ) {
        this.ticketRepository = ticketRepository;
        this.commentRepository = commentRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> listComments(Long ticketId) {
        return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId)
                .stream()
                .map(CommentService::toResponse)
                .toList();
    }

    @Transactional
    public CommentResponse addComment(Long ticketId, Long authorId, CommentCreateRequest request) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(ticketId));

        if (authorId == null || authorId <= 0) {
            throw new IllegalArgumentException("authorId is required");
        }

        String body = request.body() == null ? "" : request.body().trim();
        if (body.isBlank()) {
            throw new IllegalArgumentException("body is required");
        }

        Comment saved = commentRepository.save(
                new Comment(ticket, authorId, body, OffsetDateTime.now())
        );

        notificationService.notifyOnComment(saved);

        return toResponse(saved);
    }

    private static CommentResponse toResponse(Comment c) {
        return new CommentResponse(
                c.getId(),
                c.getTicket().getId(),
                c.getAuthorId(),
                c.getBody(),
                c.getCreatedAt()
        );
    }
}