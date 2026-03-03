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

export type UnreadCountResponse = { count: number };

export class ApiRequestError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(`Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export async function fetchNotifications(params: {
  userId: number;
  unreadOnly?: boolean;
  limit?: number;
}): Promise<NotificationResponse[]> {
  const url = new URL("/notifications", BASE_URL);
  url.searchParams.set("userId", String(params.userId));
  url.searchParams.set("unreadOnly", String(!!params.unreadOnly));
  if (params.limit != null) url.searchParams.set("limit", String(params.limit));

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new ApiRequestError(res.status, await parseJsonSafe(res));
  return (await res.json()) as NotificationResponse[];
}

export async function fetchUnreadCount(userId: number): Promise<number> {
  const url = new URL("/notifications/unread-count", BASE_URL);
  url.searchParams.set("userId", String(userId));

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new ApiRequestError(res.status, await parseJsonSafe(res));
  const data = (await res.json()) as UnreadCountResponse;
  return data.count;
}

export async function markNotificationAsRead(params: {
  notificationId: number;
  userId: number;
}): Promise<NotificationResponse> {
  const url = new URL(`/notifications/${params.notificationId}/read`, BASE_URL);

  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ userId: params.userId }),
  });

  if (!res.ok) throw new ApiRequestError(res.status, await parseJsonSafe(res));
  return (await res.json()) as NotificationResponse;
}

export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  const url = new URL("/notifications/read-all", BASE_URL);
  url.searchParams.set("userId", String(userId));

  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) throw new ApiRequestError(res.status, await parseJsonSafe(res));
}