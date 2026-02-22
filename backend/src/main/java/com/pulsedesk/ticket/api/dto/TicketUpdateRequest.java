package com.pulsedesk.ticket.api.dto;

import com.pulsedesk.ticket.domain.TicketPriority;
import jakarta.validation.constraints.Size;

public class TicketUpdateRequest {

    @Size(min = 3, max = 255)
    private String title;

    @Size(min = 3)
    private String description;

    private TicketPriority priority;

    private Long assigneeId;

    public TicketUpdateRequest() {}

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public TicketPriority getPriority() {
        return priority;
    }

    public Long getAssigneeId() {
        return assigneeId;
    }
}