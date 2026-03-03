package com.pulsedesk.notification.api;

import com.pulsedesk.notification.api.dto.MarkNotificationReadRequest;
import com.pulsedesk.notification.api.dto.NotificationResponse;
import com.pulsedesk.notification.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationResponse> list(
            @RequestParam Long userId,
            @RequestParam(required = false, defaultValue = "false") boolean unreadOnly,
            @RequestParam(required = false) Integer limit
    ) {
        return notificationService.list(userId, unreadOnly, limit);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(@RequestParam Long userId) {
        return Map.of("count", notificationService.countUnread(userId));
    }

    @PatchMapping("/{id}/read")
    public NotificationResponse markAsRead(
            @PathVariable Long id,
            @Valid @RequestBody(required = true) MarkNotificationReadRequest request
    ) {
        return notificationService.markAsRead(id, request.userId());
    }

    @PostMapping("/read-all")
    public void markAllAsRead(@RequestParam Long userId) {
        notificationService.markAllAsRead(userId);
    }
}