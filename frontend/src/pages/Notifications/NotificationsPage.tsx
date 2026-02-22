import { Link } from "react-router-dom";

type Notification = {
  id: number;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

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

export default function NotificationsPage() {
  const items: Notification[] = [
    {
      id: 1,
      title: "Ticket assigned",
      body: "A ticket was assigned to your team.",
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      read: false,
    },
    {
      id: 2,
      title: "Ticket resolved",
      body: "A ticket was marked as resolved.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      read: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Updates and events related to your workspace.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* List */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="text-sm font-semibold text-slate-900">Inbox</div>
            <div className="mt-1 text-sm text-slate-600">
              This will be connected to the notifications API in a later phase.
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((n) => (
              <div key={n.id} className="px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {n.title}
                      </div>
                      {!n.read && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>

                    <div className="mt-1 text-sm text-slate-600">{n.body}</div>

                    <div className="mt-2 text-xs text-slate-500">
                      {formatDateTime(n.createdAt)}
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-slate-500">
                    {n.read ? "READ" : "NEW"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-slate-600">
              No notifications.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
