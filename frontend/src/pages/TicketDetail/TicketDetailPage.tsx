import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | string;
type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | string;

type Ticket = {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId?: number;
  assigneeId?: number | null;
  teamId?: number;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string | null;
};

type ApiError = {
  code?: string;
  message?: string;
  details?: Record<string, string>;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Badge({
  kind,
  value,
}: {
  kind: "status" | "priority";
  value: string;
}) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold";

  if (kind === "status") {
    const cls =
      value === "OPEN"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : value === "IN_PROGRESS"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : value === "RESOLVED"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : value === "CLOSED"
              ? "border-slate-200 bg-slate-50 text-slate-700"
              : "border-slate-200 bg-white text-slate-700";

    return <span className={cx(base, cls)}>{value.replaceAll("_", " ")}</span>;
  }

  const cls =
    value === "HIGH"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : value === "MEDIUM"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : value === "LOW"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-700";

  return <span className={cx(base, cls)}>{value}</span>;
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Skeleton({ className }: { className: string }) {
  return <div className={cx("animate-pulse rounded bg-slate-100", className)} />;
}

export default function TicketDetailPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();

  const ticketId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [id]);

  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setTicket(null);
    setNotFound(false);
    setError(null);

    if (ticketId === null) {
      setNotFound(true);
      return;
    }

    setLoading(true);

    fetch(`/api/tickets/${ticketId}`)
      .then(async (r) => {
        if (r.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        if (!r.ok) {
          let err: ApiError | null = null;
          try {
            err = (await r.json()) as ApiError;
          } catch {
            
          }
          throw new Error(err?.message ?? `${r.status} ${r.statusText}`);
        }
        return (await r.json()) as Ticket;
      })
      .then((json) => {
        if (cancelled) return;
        if (json) setTicket(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-5xl px-4 py-10">
          <button
            type="button"
            onClick={() => nav("/tickets")}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Tickets
          </button>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">
              Ticket not found
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              This ticket does not exist or you may not have access.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => nav("/tickets")}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Go to Tickets
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-5xl px-4 py-10">
          <Link
            to="/tickets"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Tickets
          </Link>

          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
            <div className="text-sm font-semibold">Failed to load ticket</div>
            <div className="mt-2 text-sm">{error}</div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => nav("/tickets")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const t = ticket;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/tickets"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Tickets
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              title="Actions will be enabled in a later phase"
            >
              Edit
            </button>
            <button
              type="button"
              disabled
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              title="Actions will be enabled in a later phase"
            >
              Change Status
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-500">
                {loading || !t ? "Ticket" : `Ticket #${t.id}`}
              </div>

              <div className="mt-1">
                {loading || !t ? (
                  <Skeleton className="h-8 w-2/3" />
                ) : (
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">
                    {t.title}
                  </h1>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {loading || !t ? (
                  <>
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </>
                ) : (
                  <>
                    <Badge kind="status" value={String(t.status)} />
                    <Badge kind="priority" value={String(t.priority)} />
                  </>
                )}
              </div>
            </div>

            <div className="text-sm text-slate-600">
              {loading || !t ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                <div>
                  Updated{" "}
                  <span className="font-semibold text-slate-900">
                    {formatDateTime(t.updatedAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: description */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">
                Description
              </div>

              <div className="mt-4">
                {loading || !t ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-10/12" />
                    <Skeleton className="h-4 w-8/12" />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {t.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              <div className="font-semibold text-slate-900">Read-only</div>
              <div className="mt-1">
                Actions (edit/status transition) will be enabled in a later phase.
              </div>
            </div>
          </div>

          {/* Right: details */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Details</div>

              <div className="mt-4 grid gap-3">
                <DetailItem
                  label="Status"
                  value={
                    loading || !t ? (
                      <Skeleton className="h-5 w-24" />
                    ) : (
                      String(t.status).replaceAll("_", " ")
                    )
                  }
                />
                <DetailItem
                  label="Priority"
                  value={loading || !t ? <Skeleton className="h-5 w-20" /> : String(t.priority)}
                />
                <DetailItem
                  label="Requester ID"
                  value={loading || !t ? <Skeleton className="h-5 w-16" /> : t.requesterId ?? "—"}
                />
                <DetailItem
                  label="Assignee ID"
                  value={
                    loading || !t ? (
                      <Skeleton className="h-5 w-24" />
                    ) : t.assigneeId === null ? (
                      "Unassigned"
                    ) : (
                      t.assigneeId ?? "—"
                    )
                  }
                />
                <DetailItem
                  label="Team ID"
                  value={loading || !t ? <Skeleton className="h-5 w-12" /> : t.teamId ?? "—"}
                />

                <div className="my-1 h-px bg-slate-100" />

                <DetailItem
                  label="Created At"
                  value={loading || !t ? <Skeleton className="h-5 w-40" /> : formatDateTime(t.createdAt)}
                />
                <DetailItem
                  label="Updated At"
                  value={loading || !t ? <Skeleton className="h-5 w-40" /> : formatDateTime(t.updatedAt)}
                />
                <DetailItem
                  label="Resolved At"
                  value={
                    loading || !t ? (
                      <Skeleton className="h-5 w-40" />
                    ) : t.resolvedAt ? (
                      formatDateTime(t.resolvedAt)
                    ) : (
                      "—"
                    )
                  }
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              <div className="font-semibold text-slate-900">Tip</div>
              <div className="mt-1">
                Use the Tickets list to quickly open and review incoming issues.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}