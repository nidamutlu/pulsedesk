package com.pulsedesk.ticket.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

/** JPA entity mapped to the `tickets` table. */
@Entity
@Table(name = "tickets")
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
    private Long assigneeId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    protected Ticket() {
        // Required by JPA
    }

    /** Creates a new Ticket with required fields; timestamps/status are set by the service. */
    public Ticket(String title, String description, TicketPriority priority, Long requesterId, Long teamId) {
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.requesterId = requesterId;
        this.teamId = teamId;
    }

    /* Getters */

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public TicketStatus getStatus() { return status; }
    public TicketPriority getPriority() { return priority; }
    public Long getRequesterId() { return requesterId; }
    public Long getAssigneeId() { return assigneeId; }
    public Long getTeamId() { return teamId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public OffsetDateTime getResolvedAt() { return resolvedAt; }

    /* Controlled updates */

    public void setStatus(TicketStatus status) {
        this.status = status;
    }

    public void setAssigneeId(Long assigneeId) {
        this.assigneeId = assigneeId;
    }

    public void setResolvedAt(OffsetDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    // Used by PUT /tickets/{id}
    public void updateDetails(String title,
                              String description,
                              TicketPriority priority,
                              Long assigneeId,
                              OffsetDateTime updatedAt) {
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.assigneeId = assigneeId;
        this.updatedAt = updatedAt;
    }
}
