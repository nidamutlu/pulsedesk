import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiRequestError,
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationResponse,
} from "../../api/notifications";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function titleFor(n: NotificationResponse) {
  if (n.type === "MENTION") return "Mention";
  if (n.type === "COMMENT_ADDED") return "New comment";
  return n.type;
}

export default function NotificationsPage() {
  const userId = 2;

  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasUnread = useMemo(() => items.some((n) => !n.readAt), [items]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [list, count] = await Promise.all([
        fetchNotifications({ userId, unreadOnly, limit: 50 }),
        fetchUnreadCount(userId),
      ]);
      setItems(list);
      setUnreadCount(count);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setError(typeof e.body === "string" ? e.body : JSON.stringify(e.body));
      } else {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, unreadOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const onMarkRead = useCallback(
    async (id: number) => {
      setError(null);
      setActionLoadingId(id);
      try {
        const updated = await markNotificationAsRead({ notificationId: id, userId });
        setItems((prev) => prev.map((n) => (n.id === id ? updated : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to mark as read");
      } finally {
        setActionLoadingId(null);
      }
    },
    [userId]
  );

  const onMarkAllRead = useCallback(async () => {
    setError(null);
    setBulkLoading(true);
    try {
      await markAllNotificationsAsRead(userId);
      const nowIso = new Date().toISOString();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? nowIso })));
      setUnreadCount(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark all as read");
    } finally {
      setBulkLoading(false);
    }
  }, [userId]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Updates and events related to your workspace.
              <span className="ml-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                Unread: {unreadCount}
              </span>
            </p>
          </div>

          <Link
            to="/dashboard"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Inbox</div>
                <div className="mt-1 text-sm text-slate-600">
                  Your latest notifications from PulseDesk.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUnreadOnly((v) => !v)}
                  className={cx(
                    "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                    unreadOnly
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                  )}
                >
                  {unreadOnly ? "Showing unread" : "Show unread"}
                </button>

                <button
                  type="button"
                  onClick={onMarkAllRead}
                  disabled={!hasUnread || bulkLoading || loading}
                  className={cx(
                    "rounded-xl px-3 py-2 text-xs font-semibold transition",
                    !hasUnread || bulkLoading || loading
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  )}
                >
                  {bulkLoading ? "Marking..." : "Mark all read"}
                </button>

                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className={cx(
                    "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                    loading
                      ? "cursor-not-allowed border-slate-200 bg-white text-slate-500"
                      : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                  )}
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-600">
              {loading ? "Loading..." : "No notifications."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((n) => {
                const isUnread = !n.readAt;
                const isActionLoading = actionLoadingId === n.id;

                return (
                  <div
                    key={n.id}
                    className={cx("px-6 py-5", isUnread && "bg-slate-50")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {titleFor(n)}
                          </div>
                          {isUnread && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>

                        <div className="mt-1 text-sm text-slate-600">
                          {n.message}
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                          {formatDateTime(n.createdAt)}
                          {n.ticketId ? ` • Ticket #${n.ticketId}` : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-xs font-semibold text-slate-500">
                          {isUnread ? "NEW" : "READ"}
                        </div>

                        <button
                          type="button"
                          onClick={() => void onMarkRead(n.id)}
                          disabled={!isUnread || isActionLoading}
                          className={cx(
                            "rounded-xl px-3 py-2 text-xs font-semibold transition",
                            !isUnread || isActionLoading
                              ? "cursor-not-allowed bg-slate-200 text-slate-500"
                              : "bg-slate-900 text-white hover:bg-slate-800"
                          )}
                        >
                          {isActionLoading ? "Marking..." : "Mark read"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}