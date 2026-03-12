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

export type NotificationListParams = {
  unreadOnly?: boolean;
  limit?: number;
};

type UnreadCountResponse = {
  count: number;
};

function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function fetchNotifications(
  params: NotificationListParams = {}
): Promise<NotificationResponse[]> {
  const query = buildQuery({
    unreadOnly: params.unreadOnly,
    limit: params.limit,
  });

  return http<NotificationResponse[]>(`/notifications${query}`);
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