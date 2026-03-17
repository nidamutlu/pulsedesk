package com.pulsedesk.ticket.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

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
    private Long assigneeId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    public Ticket(
            String title,
            String description,
            TicketPriority priority,
            Long requesterId,
            Long teamId
    ) {
        this.title = requireNonBlank(title, "title must not be blank");
        this.description = requireNonBlank(description, "description must not be blank");
        this.priority = requireNonNull(priority, "priority must not be null");
        this.requesterId = requireNonNull(requesterId, "requesterId must not be null");
        this.teamId = requireNonNull(teamId, "teamId must not be null");
        this.status = TicketStatus.OPEN;
        this.resolvedAt = null;
    }

    public void assignTo(Long assigneeId) {
        this.assigneeId = requireNonNull(assigneeId, "assigneeId must not be null");
    }

    public void initializeTimestamps(OffsetDateTime now) {
        OffsetDateTime value = requireNonNull(now, "now must not be null");
        this.createdAt = value;
        this.updatedAt = value;
    }

    public void touch(OffsetDateTime updatedAt) {
        this.updatedAt = requireNonNull(updatedAt, "updatedAt must not be null");
    }

    public void changeStatus(TicketStatus status, OffsetDateTime updatedAt) {
        this.status = requireNonNull(status, "status must not be null");
        this.updatedAt = requireNonNull(updatedAt, "updatedAt must not be null");

        if (status != TicketStatus.RESOLVED) {
            this.resolvedAt = null;
        }
    }

    public void markResolved(OffsetDateTime resolvedAt) {
        OffsetDateTime value = requireNonNull(resolvedAt, "resolvedAt must not be null");
        this.status = TicketStatus.RESOLVED;
        this.resolvedAt = value;
        this.updatedAt = value;
    }

    public void reopenFromResolved(OffsetDateTime updatedAt) {
        OffsetDateTime value = requireNonNull(updatedAt, "updatedAt must not be null");
        this.status = TicketStatus.IN_PROGRESS;
        this.resolvedAt = null;
        this.updatedAt = value;
    }

    public void updateDetails(
            String title,
            String description,
            TicketPriority priority,
            OffsetDateTime updatedAt
    ) {
        this.title = requireNonBlank(title, "title must not be blank");
        this.description = requireNonBlank(description, "description must not be blank");
        this.priority = requireNonNull(priority, "priority must not be null");
        this.updatedAt = requireNonNull(updatedAt, "updatedAt must not be null");
    }

    private static String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }

    private static <T> T requireNonNull(T value, String message) {
        if (value == null) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }
}