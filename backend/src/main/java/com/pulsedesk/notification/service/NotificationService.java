package com.pulsedesk.notification.service;

import com.pulsedesk.notification.api.dto.NotificationResponse;
import com.pulsedesk.notification.domain.Notification;
import com.pulsedesk.notification.domain.NotificationType;
import com.pulsedesk.notification.exception.NotificationNotFoundException;
import com.pulsedesk.notification.repository.NotificationRepository;
import com.pulsedesk.ticket.domain.Comment;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class NotificationService {

    private static final Pattern MENTION_USER_ID = Pattern.compile("@(\\d+)");
    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 200;

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> list(Long userId, boolean unreadOnly, Integer limit) {
        requireValidUserId(userId);

        int take = normalizeLimit(limit);
        Pageable page = PageRequest.of(0, take);

        List<Notification> items = unreadOnly
                ? notificationRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId, page)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, page);

        return items.stream().map(NotificationService::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        requireValidUserId(userId);
        return notificationRepository.countByUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId, Long userId) {
        requireValidUserId(userId);

        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotificationNotFoundException(notificationId));

        if (!userId.equals(n.getUserId())) {
            throw new IllegalArgumentException("Notification does not belong to the current user");
        }

        if (n.getReadAt() == null) {
            n.setReadAt(OffsetDateTime.now());
            n = notificationRepository.save(n);
        }

        return toResponse(n);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        requireValidUserId(userId);

        int pageNumber = 0;

        while (true) {
            Pageable page = PageRequest.of(pageNumber, MAX_LIMIT);

            List<Notification> batch =
                    notificationRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId, page);

            if (batch.isEmpty()) break;

            OffsetDateTime now = OffsetDateTime.now();
            batch.forEach(n -> n.setReadAt(now));

            notificationRepository.saveAll(batch);

            if (batch.size() < MAX_LIMIT) break;

            pageNumber++;
        }
    }

    @Transactional
    public void notifyOnComment(Comment comment) {
        if (comment == null) return;

        var ticket = comment.getTicket();
        if (ticket == null) return;

        Long authorId = comment.getAuthorId();
        Long ticketId = ticket.getId();

        Set<Long> mentionedIds = extractMentionedUserIds(comment.getBody());

        Set<Long> recipients = new LinkedHashSet<>();
        if (ticket.getRequesterId() != null) recipients.add(ticket.getRequesterId());
        if (ticket.getAssigneeId() != null) recipients.add(ticket.getAssigneeId());
        recipients.addAll(mentionedIds);

        recipients.remove(authorId);

        for (Long userId : recipients) {
            if (!isValidUserId(userId)) continue;

            NotificationType type = mentionedIds.contains(userId)
                    ? NotificationType.MENTION
                    : NotificationType.COMMENT_ADDED;

            String message = (type == NotificationType.MENTION)
                    ? "You were mentioned on Ticket #" + ticketId
                    : "New comment on Ticket #" + ticketId;

            createNotification(userId, comment, type, message);
        }
    }

    private void createNotification(Long userId, Comment comment, NotificationType type, String message) {
        Notification n = new Notification(
                userId,
                comment.getTicket(),
                comment,
                type,
                message,
                OffsetDateTime.now()
        );
        notificationRepository.save(n);
    }

    private static NotificationResponse toResponse(Notification n) {
        Long ticketId = (n.getTicket() != null) ? n.getTicket().getId() : null;
        Long commentId = (n.getComment() != null) ? n.getComment().getId() : null;

        return new NotificationResponse(
                n.getId(),
                n.getUserId(),
                ticketId,
                commentId,
                n.getType(),
                n.getMessage(),
                n.getCreatedAt(),
                n.getReadAt()
        );
    }

    private static Set<Long> extractMentionedUserIds(String body) {
        if (body == null || body.isBlank()) return Set.of();

        Matcher m = MENTION_USER_ID.matcher(body);
        Set<Long> out = new LinkedHashSet<>();
        while (m.find()) {
            try {
                out.add(Long.parseLong(m.group(1)));
            } catch (NumberFormatException ignored) {
            }
        }
        return out;
    }

    private static int normalizeLimit(Integer limit) {
        if (limit == null || limit <= 0) return DEFAULT_LIMIT;
        return Math.min(limit, MAX_LIMIT);
    }

    private static void requireValidUserId(Long userId) {
        if (!isValidUserId(userId)) {
            throw new IllegalArgumentException("userId is required");
        }
    }

    private static boolean isValidUserId(Long userId) {
        return userId != null && userId > 0;
    }
}