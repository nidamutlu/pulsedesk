package com.pulsedesk.ticket.api.dto;

import com.pulsedesk.ticket.domain.TicketPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for creating a new ticket.
 * Used by POST /tickets endpoint.
 */
public class TicketCreateRequest {

    @NotBlank(message = "title is required")
    private String title;

    @NotBlank(message = "description is required")
    private String description;

    @NotNull(message = "priority is required")
    private TicketPriority priority;

    @NotNull(message = "requesterId is required")
    private Long requesterId;

    @NotNull(message = "teamId is required")
    private Long teamId;

    /**
     * Required by Jackson for JSON deserialization.
     */
    protected TicketCreateRequest() {
    }

    /* Getters */

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public TicketPriority getPriority() {
        return priority;
    }

    public Long getRequesterId() {
        return requesterId;
    }

    public Long getTeamId() {
        return teamId;
    }
}
