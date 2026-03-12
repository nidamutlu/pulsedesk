package com.pulsedesk.ticket.api.dto;

import com.pulsedesk.ticket.domain.Ticket;
import com.pulsedesk.ticket.domain.TicketPriority;
import com.pulsedesk.ticket.domain.TicketStatus;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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
        TicketResponse dto = new TicketResponse();

        dto.id = ticket.getId();
        dto.title = ticket.getTitle();
        dto.description = ticket.getDescription();
        dto.status = ticket.getStatus();
        dto.priority = ticket.getPriority();
        dto.requesterId = ticket.getRequesterId();
        dto.assigneeId = ticket.getAssigneeId();
        dto.teamId = ticket.getTeamId();
        dto.createdAt = ticket.getCreatedAt();
        dto.updatedAt = ticket.getUpdatedAt();
        dto.resolvedAt = ticket.getResolvedAt();

        return dto;
    }
}