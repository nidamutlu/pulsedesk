package com.pulsedesk.ticket.api.dto;

import com.pulsedesk.ticket.domain.TicketAuditLog;
import com.pulsedesk.ticket.domain.TicketStatus;

import java.time.OffsetDateTime;

public record TicketAuditLogResponse(
        Long id,
        String action,
        TicketStatus oldStatus,
        TicketStatus newStatus,
        Long oldAssigneeId,
        Long newAssigneeId,
        Long actorId,
        OffsetDateTime createdAt
) {
    public static TicketAuditLogResponse from(TicketAuditLog log) {
        return new TicketAuditLogResponse(
                log.getId(),
                log.getAction() == null ? null : log.getAction().name(),
                log.getOldStatus(),
                log.getNewStatus(),
                log.getOldAssigneeId(),
                log.getNewAssigneeId(),
                log.getActorId(),
                log.getCreatedAt()
        );
    }
}