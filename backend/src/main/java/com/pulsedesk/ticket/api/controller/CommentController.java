package com.pulsedesk.ticket.api.controller;

import com.pulsedesk.security.AuthPrincipal;
import com.pulsedesk.ticket.api.dto.CommentCreateRequest;
import com.pulsedesk.ticket.api.dto.CommentResponse;
import com.pulsedesk.ticket.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tickets/{ticketId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping
    public List<CommentResponse> listComments(
            @PathVariable Long ticketId,
            @AuthenticationPrincipal AuthPrincipal currentUser
    ) {
        return commentService.listComments(currentUser, ticketId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse addComment(
            @PathVariable Long ticketId,
            @Valid @RequestBody CommentCreateRequest request,
            @AuthenticationPrincipal AuthPrincipal currentUser
    ) {
        return commentService.addComment(currentUser, ticketId, request);
    }
}