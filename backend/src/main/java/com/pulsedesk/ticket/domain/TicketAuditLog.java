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

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @Column(nullable = false, length = 50)
    private String action; // STATUS_CHANGE, ASSIGNEE_CHANGE

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

    public static TicketAuditLog statusChange(Long ticketId, TicketStatus from, TicketStatus to, Long actorId) {
        TicketAuditLog l = new TicketAuditLog();
        l.ticketId = ticketId;
        l.action = "STATUS_CHANGE";
        l.oldStatus = from.name();
        l.newStatus = to.name();
        l.actorId = actorId;
        l.createdAt = OffsetDateTime.now();
        return l;
    }

    public static TicketAuditLog assigneeChange(Long ticketId, Long oldA, Long newA, Long actorId) {
        TicketAuditLog l = new TicketAuditLog();
        l.ticketId = ticketId;
        l.action = "ASSIGNEE_CHANGE";
        l.oldAssigneeId = oldA;
        l.newAssigneeId = newA;
        l.actorId = actorId;
        l.createdAt = OffsetDateTime.now();
        return l;
    }
}