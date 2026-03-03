package com.pulsedesk.ticket.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "tickets")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TicketStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TicketPriority priority;

    @Column(name = "requester_id", nullable = false)
    private Long requesterId;

    @Column(name = "assignee_id")
    @Setter
    private Long assigneeId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "created_at", nullable = false)
    @Setter
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    @Setter
    private OffsetDateTime updatedAt;

    @Column(name = "resolved_at")
    @Setter
    private OffsetDateTime resolvedAt;

    public Ticket(String title, String description, TicketPriority priority, Long requesterId, Long teamId) {
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.requesterId = requesterId;
        this.teamId = teamId;
    }

    public void setStatus(TicketStatus status) {
        this.status = status;
    }

    public void updateDetails(
            String title,
            String description,
            TicketPriority priority,
            Long assigneeId,
            OffsetDateTime updatedAt
    ) {
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.assigneeId = assigneeId;
        this.updatedAt = updatedAt;
    }
}