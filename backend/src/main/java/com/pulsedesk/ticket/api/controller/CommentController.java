package com.pulsedesk.ticket.api.controller;

import com.pulsedesk.security.AuthPrincipal;
import com.pulsedesk.ticket.api.dto.CommentCreateRequest;
import com.pulsedesk.ticket.api.dto.CommentResponse;
import com.pulsedesk.ticket.service.CommentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tickets/{ticketId}/comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping
    public List<CommentResponse> list(@PathVariable Long ticketId) {
        return commentService.listComments(ticketId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse add(
            @PathVariable Long ticketId,
            @Valid @RequestBody CommentCreateRequest request,
            @AuthenticationPrincipal AuthPrincipal me
    ) {
        return commentService.addComment(ticketId, me.userId(), request);
    }
}