package com.pulsedesk.notification.service;

import com.pulsedesk.notification.api.dto.NotificationResponse;
import com.pulsedesk.notification.domain.Notification;
import com.pulsedesk.notification.domain.NotificationType;
import com.pulsedesk.notification.exception.NotificationNotFoundException;
import com.pulsedesk.notification.repository.NotificationRepository;
import com.pulsedesk.ticket.domain.Comment;
import com.pulsedesk.user.repo.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class NotificationService {

    private static final Pattern MENTION_USERNAME =
            Pattern.compile("(?<!\\w)@([A-Za-z0-9._-]+)");
    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 200;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listByUserId(Long userId, boolean unreadOnly, Integer limit) {
        requireValidUserId(userId);

        int take = normalizeLimit(limit);
        Pageable page = PageRequest.of(0, take);

        List<Notification> items = unreadOnly
                ? notificationRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId, page)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, page);

        return items.stream()
                .map(NotificationService::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countUnreadByUserId(Long userId) {
        requireValidUserId(userId);
        return notificationRepository.countByUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public NotificationResponse markAsReadByUserId(Long notificationId, Long userId) {
        requireValidUserId(userId);

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotificationNotFoundException(notificationId));

        if (!userId.equals(notification.getUserId())) {
            throw new AccessDeniedException("Notification does not belong to the current user");
        }

        if (notification.getReadAt() == null) {
            notification.setReadAt(OffsetDateTime.now());
            notification = notificationRepository.save(notification);
        }

        return toResponse(notification);
    }

    @Transactional
    public void markAllAsReadByUserId(Long userId) {
        requireValidUserId(userId);

        int pageNumber = 0;

        while (true) {
            Pageable page = PageRequest.of(pageNumber, MAX_LIMIT);

            List<Notification> batch =
                    notificationRepository.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId, page);

            if (batch.isEmpty()) {
                break;
            }

            OffsetDateTime now = OffsetDateTime.now();
            batch.forEach(notification -> notification.setReadAt(now));
            notificationRepository.saveAll(batch);

            if (batch.size() < MAX_LIMIT) {
                break;
            }

            pageNumber++;
        }
    }

    @Transactional
    public void notifyOnComment(Comment comment) {
        if (comment == null || comment.getTicket() == null) {
            return;
        }

        Long authorId = comment.getAuthorId();
        Long ticketId = comment.getTicket().getId();

        Set<Long> mentionedUserIds = extractMentionedUserIds(comment.getBody());

        Set<Long> recipients = new LinkedHashSet<>();
        if (comment.getTicket().getRequesterId() != null) {
            recipients.add(comment.getTicket().getRequesterId());
        }
        if (comment.getTicket().getAssigneeId() != null) {
            recipients.add(comment.getTicket().getAssigneeId());
        }
        recipients.addAll(mentionedUserIds);
        recipients.remove(authorId);

        for (Long recipientUserId : recipients) {
            if (!isValidUserId(recipientUserId)) {
                continue;
            }

            NotificationType type = mentionedUserIds.contains(recipientUserId)
                    ? NotificationType.MENTION
                    : NotificationType.COMMENT_ADDED;

            String message = type == NotificationType.MENTION
                    ? "You were mentioned on Ticket #" + ticketId
                    : "New comment on Ticket #" + ticketId;

            createNotification(recipientUserId, comment, type, message);
        }
    }

    private void createNotification(Long userId, Comment comment, NotificationType type, String message) {
        Notification notification = new Notification(
                userId,
                comment.getTicket(),
                comment,
                type,
                message
        );
        notificationRepository.save(notification);
    }

    private Set<Long> extractMentionedUserIds(String body) {
        if (body == null || body.isBlank()) {
            return Set.of();
        }

        Matcher matcher = MENTION_USERNAME.matcher(body);
        Set<Long> mentionedUserIds = new LinkedHashSet<>();

        while (matcher.find()) {
            String rawUsername = matcher.group(1);
            String username = normalizeMention(rawUsername);

            userRepository.findByUsernameIgnoreCase(username)
                    .map(user -> user.getId())
                    .ifPresent(mentionedUserIds::add);
        }

        return mentionedUserIds;
    }

    private static String normalizeMention(String username) {
        if (username == null) {
            return "";
        }

        return username
                .trim()
                .replaceAll("[.,;:!?]+$", "")
                .toLowerCase(Locale.ROOT);
    }

    private static NotificationResponse toResponse(Notification notification) {
        Long ticketId = notification.getTicket() != null ? notification.getTicket().getId() : null;
        Long commentId = notification.getComment() != null ? notification.getComment().getId() : null;

        return new NotificationResponse(
                notification.getId(),
                notification.getUserId(),
                ticketId,
                commentId,
                notification.getType(),
                notification.getMessage(),
                notification.getCreatedAt(),
                notification.getReadAt()
        );
    }

    private static int normalizeLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_LIMIT;
        }
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