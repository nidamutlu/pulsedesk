import { http } from "./http";

export type NotificationType = "COMMENT_ADDED" | "MENTION";

export type NotificationResponse = {
  id: number;
  userId: number;
  ticketId: number | null;
  commentId: number | null;
  type: NotificationType;
  message: string;
  createdAt: string;
  readAt: string | null;
};

type UnreadCountResponse = {
  count: number;
};

export async function fetchNotifications(params?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<NotificationResponse[]> {
  const q = new URLSearchParams();

  if (params?.unreadOnly !== undefined) {
    q.set("unreadOnly", String(params.unreadOnly));
  }

  if (params?.limit !== undefined) {
    q.set("limit", String(params.limit));
  }

  const qs = q.toString();
  return http<NotificationResponse[]>(`/notifications${qs ? `?${qs}` : ""}`);
}

export async function fetchUnreadCount(): Promise<number> {
  const data = await http<UnreadCountResponse>("/notifications/unread-count");
  return data.count;
}

export async function markNotificationAsRead(
  notificationId: number
): Promise<NotificationResponse> {
  return http<NotificationResponse>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await http<void>("/notifications/read-all", {
    method: "PATCH",
  });
}