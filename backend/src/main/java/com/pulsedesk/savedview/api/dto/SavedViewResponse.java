package com.pulsedesk.savedview.api.dto;

import com.pulsedesk.savedview.domain.SavedView;

import java.time.OffsetDateTime;

public record SavedViewResponse(
        Long id,
        String name,
        String filterJson,
        OffsetDateTime createdAt
) {

    public static SavedViewResponse from(SavedView savedView) {
        return new SavedViewResponse(
                savedView.getId(),
                savedView.getName(),
                savedView.getFilterJson(),
                savedView.getCreatedAt()
        );
    }
}