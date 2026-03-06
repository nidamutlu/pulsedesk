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

    @Column(name = "old_status", length = 50)
    private String oldStatus;

    @Column(name = "new_status", length = 50)
    private String newStatus;

    @Column(name = "old_assignee_id")
    private Long oldAssigneeId;

    @Column(name = "new_assignee_id")
    private Long newAssigneeId;

    @Column(name = "actor_id", nullable = false)
    private Long actorId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    public static TicketAuditLog statusChange(Long ticketId, TicketStatus from, TicketStatus to, Long actorId) {
        TicketAuditLog l = new TicketAuditLog();
        l.ticketId = ticketId;
        l.action = Action.STATUS_CHANGE;
        l.oldStatus = from != null ? from.name() : null;
        l.newStatus = to != null ? to.name() : null;
        l.actorId = actorId;
        return l;
    }

    public static TicketAuditLog assigneeChange(Long ticketId, Long oldA, Long newA, Long actorId) {
        TicketAuditLog l = new TicketAuditLog();
        l.ticketId = ticketId;
        l.action = Action.ASSIGNEE_CHANGE;
        l.oldAssigneeId = oldA;
        l.newAssigneeId = newA;
        l.actorId = actorId;
        return l;
    }
}