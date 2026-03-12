package com.pulsedesk.ticket.service;

import com.pulsedesk.notification.service.NotificationService;
import com.pulsedesk.security.AuthPrincipal;
import com.pulsedesk.ticket.api.dto.CommentCreateRequest;
import com.pulsedesk.ticket.api.dto.CommentResponse;
import com.pulsedesk.ticket.domain.Comment;
import com.pulsedesk.ticket.domain.Ticket;
import com.pulsedesk.ticket.exception.TicketNotFoundException;
import com.pulsedesk.ticket.repository.CommentRepository;
import com.pulsedesk.ticket.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class CommentService {

    private final TicketRepository ticketRepository;
    private final CommentRepository commentRepository;
    private final NotificationService notificationService;
    private final TicketService ticketService;

    @Transactional(readOnly = true)
    public List<CommentResponse> listComments(AuthPrincipal currentUser, Long ticketId) {
        requireAuthenticated(currentUser);

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(ticketId));

        ticketService.getTicketById(currentUser, ticket.getId());

        return commentRepository.findByTicket_IdOrderByCreatedAtAsc(ticket.getId())
                .stream()
                .map(CommentResponse::from)
                .toList();
    }

    public CommentResponse addComment(
            AuthPrincipal currentUser,
            Long ticketId,
            CommentCreateRequest request
    ) {
        requireAuthenticated(currentUser);

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(ticketId));

        ticketService.getTicketById(currentUser, ticket.getId());

        String body = normalizeBody(request);

        Comment saved = commentRepository.save(
                new Comment(ticket, currentUser.userId(), body)
        );

        notificationService.notifyOnComment(saved);

        return CommentResponse.from(saved);
    }

    private static void requireAuthenticated(AuthPrincipal currentUser) {
        if (currentUser == null || currentUser.userId() == null) {
            throw new AccessDeniedException("Unauthenticated");
        }
    }

    private static String normalizeBody(CommentCreateRequest request) {
        if (request == null || request.body() == null) {
            throw new IllegalArgumentException("Comment body is required");
        }

        String body = request.body().trim();
        if (body.isBlank()) {
            throw new IllegalArgumentException("Comment body must not be blank");
        }

        return body;
    }
}