package com.pulsedesk.ticket.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentCreateRequest(

        @NotBlank(message = "Comment body must not be blank")
        @Size(max = 5000, message = "Comment body must be at most 5000 characters")
        String body

) {
}