package com.pulsedesk.notification.api;

import com.pulsedesk.notification.api.dto.NotificationResponse;
import com.pulsedesk.notification.service.NotificationService;
import com.pulsedesk.security.AuthPrincipal;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Validated
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> list(
            @AuthenticationPrincipal AuthPrincipal me,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(required = false) @Min(1) @Max(200) Integer limit
    ) {
        List<NotificationResponse> items =
                notificationService.listByUserId(me.userId(), unreadOnly, limit);
        return ResponseEntity.ok(items);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(
            @AuthenticationPrincipal AuthPrincipal me
    ) {
        long count = notificationService.countUnreadByUserId(me.userId());
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @AuthenticationPrincipal AuthPrincipal me,
            @PathVariable Long id
    ) {
        NotificationResponse updated =
                notificationService.markAsReadByUserId(id, me.userId());
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @AuthenticationPrincipal AuthPrincipal me
    ) {
        notificationService.markAllAsReadByUserId(me.userId());
        return ResponseEntity.noContent().build();
    }
}