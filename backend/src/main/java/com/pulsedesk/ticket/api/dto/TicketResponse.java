package com.pulsedesk.ticket.api.dto;

import com.pulsedesk.ticket.domain.Ticket;
import com.pulsedesk.ticket.domain.TicketPriority;
import com.pulsedesk.ticket.domain.TicketStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Getter
@NoArgsConstructor(access = lombok.AccessLevel.PRIVATE)
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
}