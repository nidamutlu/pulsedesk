package com.pulsedesk.security;

import com.pulsedesk.user.domain.UserRole;

public record AuthPrincipal(
        Long userId,
        String username,
        UserRole role,
        Long teamId
) {
    public boolean isAdmin() {
        return role == UserRole.ADMIN;
    }

    public boolean isAgent() {
        return role == UserRole.AGENT;
    }

    public boolean isRequester() {
        return role == UserRole.REQUESTER;
    }

    public boolean hasTeam() {
        return teamId != null && teamId > 0;
    }
}