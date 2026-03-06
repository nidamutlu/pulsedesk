package com.pulsedesk.ticket.repository;

import com.pulsedesk.ticket.domain.Ticket;
import com.pulsedesk.ticket.domain.TicketPriority;
import com.pulsedesk.ticket.domain.TicketStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.OffsetDateTime;

public final class TicketSpecifications {

    private static final String FIELD_STATUS = "status";
    private static final String FIELD_PRIORITY = "priority";
    private static final String FIELD_ASSIGNEE_ID = "assigneeId";
    private static final String FIELD_TEAM_ID = "teamId";
    private static final String FIELD_REQUESTER_ID = "requesterId";
    private static final String FIELD_CREATED_AT = "createdAt";
    private static final String FIELD_TITLE = "title";
    private static final String FIELD_DESCRIPTION = "description";

    private TicketSpecifications() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<Ticket> hasStatus(TicketStatus status) {
        return (root, query, cb) ->
                status == null ? cb.conjunction() : cb.equal(root.get(FIELD_STATUS), status);
    }

    public static Specification<Ticket> hasPriority(TicketPriority priority) {
        return (root, query, cb) ->
                priority == null ? cb.conjunction() : cb.equal(root.get(FIELD_PRIORITY), priority);
    }

    public static Specification<Ticket> hasAssignee(Long assigneeId) {
        return (root, query, cb) ->
                assigneeId == null ? cb.conjunction() : cb.equal(root.get(FIELD_ASSIGNEE_ID), assigneeId);
    }

    public static Specification<Ticket> hasTeam(Long teamId) {
        return (root, query, cb) ->
                teamId == null ? cb.conjunction() : cb.equal(root.get(FIELD_TEAM_ID), teamId);
    }

    public static Specification<Ticket> hasRequester(Long requesterId) {
        return (root, query, cb) ->
                requesterId == null ? cb.conjunction() : cb.equal(root.get(FIELD_REQUESTER_ID), requesterId);
    }

    public static Specification<Ticket> createdBetween(OffsetDateTime from, OffsetDateTime to) {
        return (root, query, cb) -> {
            if (from == null && to == null) {
                return cb.conjunction();
            }
            if (from != null && to != null) {
                return cb.between(root.get(FIELD_CREATED_AT), from, to);
            }
            if (from != null) {
                return cb.greaterThanOrEqualTo(root.get(FIELD_CREATED_AT), from);
            }
            return cb.lessThanOrEqualTo(root.get(FIELD_CREATED_AT), to);
        };
    }

    public static Specification<Ticket> queryText(String q) {
        return (root, query, cb) -> {
            if (q == null) {
                return cb.conjunction();
            }

            String normalized = q.trim();
            if (normalized.isBlank()) {
                return cb.conjunction();
            }

            String like = "%" + normalized.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get(FIELD_TITLE)), like),
                    cb.like(cb.lower(root.get(FIELD_DESCRIPTION)), like)
            );
        };
    }
}