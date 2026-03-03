package com.pulsedesk.ticket.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CommentCreateRequest(
        @NotBlank @Size(max = 5000) String body,
        @NotNull Long authorId
) {}