package com.pulsedesk.ticket.repository;

import com.pulsedesk.ticket.domain.Ticket;
import com.pulsedesk.ticket.domain.TicketPriority;
import com.pulsedesk.ticket.domain.TicketStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.OffsetDateTime;
import java.util.Locale;

public final class TicketSpecifications {

    private static final String STATUS = "status";
    private static final String PRIORITY = "priority";
    private static final String ASSIGNEE_ID = "assigneeId";
    private static final String TEAM_ID = "teamId";
    private static final String REQUESTER_ID = "requesterId";
    private static final String CREATED_AT = "createdAt";
    private static final String TITLE = "title";
    private static final String DESCRIPTION = "description";

    private TicketSpecifications() {
        throw new IllegalStateException("Utility class");
    }

    public static Specification<Ticket> hasStatus(TicketStatus status) {
        return (root, query, cb) ->
                status == null
                        ? cb.conjunction()
                        : cb.equal(root.get(STATUS), status);
    }

    public static Specification<Ticket> hasPriority(TicketPriority priority) {
        return (root, query, cb) ->
                priority == null
                        ? cb.conjunction()
                        : cb.equal(root.get(PRIORITY), priority);
    }

    public static Specification<Ticket> hasAssignee(Long assigneeId) {
        return (root, query, cb) ->
                assigneeId == null
                        ? cb.conjunction()
                        : cb.equal(root.get(ASSIGNEE_ID), assigneeId);
    }

    public static Specification<Ticket> hasTeam(Long teamId) {
        return (root, query, cb) ->
                teamId == null
                        ? cb.conjunction()
                        : cb.equal(root.get(TEAM_ID), teamId);
    }

    public static Specification<Ticket> hasRequester(Long requesterId) {
        return (root, query, cb) ->
                requesterId == null
                        ? cb.conjunction()
                        : cb.equal(root.get(REQUESTER_ID), requesterId);
    }

    public static Specification<Ticket> createdBetween(OffsetDateTime createdFrom, OffsetDateTime createdTo) {
        return (root, query, cb) -> {
            if (createdFrom == null && createdTo == null) {
                return cb.conjunction();
            }

            if (createdFrom != null && createdTo != null) {
                return cb.between(root.get(CREATED_AT), createdFrom, createdTo);
            }

            if (createdFrom != null) {
                return cb.greaterThanOrEqualTo(root.get(CREATED_AT), createdFrom);
            }

            return cb.lessThanOrEqualTo(root.get(CREATED_AT), createdTo);
        };
    }

    public static Specification<Ticket> queryText(String queryText) {
        return (root, query, cb) -> {
            String normalized = normalize(queryText);
            if (normalized == null) {
                return cb.conjunction();
            }

            String likePattern = "%" + normalized + "%";

            return cb.or(
                    cb.like(cb.lower(root.get(TITLE)), likePattern),
                    cb.like(cb.lower(root.get(DESCRIPTION)), likePattern)
            );
        };
    }

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        if (trimmed.isBlank()) {
            return null;
        }

        return trimmed.toLowerCase(Locale.ROOT);
    }
}