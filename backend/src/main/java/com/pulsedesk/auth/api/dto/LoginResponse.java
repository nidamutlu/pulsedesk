package com.pulsedesk.auth.api.dto;

public record LoginResponse(
        String accessToken,
        String refreshToken
) {}