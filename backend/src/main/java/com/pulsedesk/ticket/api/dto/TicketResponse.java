package com.pulsedesk.ticket.api.dto;

import com.pulsedesk.ticket.domain.Ticket;
import com.pulsedesk.ticket.domain.TicketPriority;
import com.pulsedesk.ticket.domain.TicketStatus;

import java.time.OffsetDateTime;

/**
 * Response DTO returned by Ticket endpoints.
 */
public class TicketResponse {

    private Long id;
    private String title;
    private String description;
    private TicketStatus status;
    private TicketPriority priority;
    private Long requesterId;
    private Long assigneeId;
    private Long teamId;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime resolvedAt;

    private TicketResponse() {
        // use factory method
    }

    /** Creates a TicketResponse from a Ticket entity. */
    public static TicketResponse from(Ticket ticket) {
        TicketResponse response = new TicketResponse();
        response.id = ticket.getId();
        response.title = ticket.getTitle();
        response.description = ticket.getDescription();
        response.status = ticket.getStatus();
        response.priority = ticket.getPriority();
        response.requesterId = ticket.getRequesterId();
        response.assigneeId = ticket.getAssigneeId();
        response.teamId = ticket.getTeamId();
        response.createdAt = ticket.getCreatedAt();
        response.updatedAt = ticket.getUpdatedAt();
        response.resolvedAt = ticket.getResolvedAt();
        return response;
    }

    /* Getters */

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public TicketPriority getPriority() {
        return priority;
    }

    public Long getRequesterId() {
        return requesterId;
    }

    public Long getAssigneeId() {
        return assigneeId;
    }

    public Long getTeamId() {
        return teamId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public OffsetDateTime getResolvedAt() {
        return resolvedAt;
    }
}
