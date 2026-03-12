package com.pulsedesk.ticket.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "ticket_audit_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TicketAuditLog {

    public enum Action {
        STATUS_CHANGE,
        ASSIGNEE_CHANGE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Action action;

    @Enumerated(EnumType.STRING)
    @Column(name = "old_status", length = 50)
    private TicketStatus oldStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", length = 50)
    private TicketStatus newStatus;

    @Column(name = "old_assignee_id")
    private Long oldAssigneeId;

    @Column(name = "new_assignee_id")
    private Long newAssigneeId;

    @Column(name = "actor_id", nullable = false)
    private Long actorId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void ensureCreatedAt() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    public static TicketAuditLog statusChange(
            Long ticketId,
            TicketStatus from,
            TicketStatus to,
            Long actorId
    ) {
        TicketAuditLog log = new TicketAuditLog();
        log.ticketId = ticketId;
        log.action = Action.STATUS_CHANGE;
        log.oldStatus = from;
        log.newStatus = to;
        log.actorId = actorId;
        return log;
    }

    public static TicketAuditLog assigneeChange(
            Long ticketId,
            Long oldAssignee,
            Long newAssignee,
            Long actorId
    ) {
        TicketAuditLog log = new TicketAuditLog();
        log.ticketId = ticketId;
        log.action = Action.ASSIGNEE_CHANGE;
        log.oldAssigneeId = oldAssignee;
        log.newAssigneeId = newAssignee;
        log.actorId = actorId;
        return log;
    }
}