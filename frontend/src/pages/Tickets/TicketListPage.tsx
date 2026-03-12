import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getCurrentUser } from "../../api/auth";
import { ApiRequestError } from "../../api/http";
import { fetchTickets } from "../../api/tickets";
import type { PageResponse, Ticket, TicketListParams } from "../../api/tickets";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function truncate(text?: string | null, max = 140) {
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function getTeamLabel(teamId?: number | null) {
  switch (teamId) {
    case 1:
      return "NETWORK / ACCESS";
    case 2:
      return "INFRA / DEVOPS";
    case 3:
      return "APPLICATION / BACKEND";
    default:
      return "UNASSIGNED TEAM";
  }
}

function formatPriority(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
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
          : value === "WAITING_CUSTOMER"
            ? "border-violet-200 bg-violet-50 text-violet-700"
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

  return <span className={cx(base, cls)}>{formatPriority(value)}</span>;
}

function TeamBadge({ teamId }: { teamId?: number | null }) {
  const label = getTeamLabel(teamId);

  const cls =
    teamId === 1
      ? "border-cyan-200 bg-cyan-50 text-cyan-700"
      : teamId === 2
        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
        : teamId === 3
          ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        cls
      )}
    >
      {label}
    </span>
  );
}

function Skeleton({ className }: { className: string }) {
  return <div className={cx("animate-pulse rounded bg-slate-100", className)} />;
}

function getApiErrorMessage(e: ApiRequestError) {
  const d = e.details as
    | { code?: string; message?: string }
    | null
    | undefined;

  const code = typeof d?.code === "string" ? d.code : null;
  const msg = typeof d?.message === "string" ? d.message : e.message;

  return `${e.status}${code ? ` • ${code}` : ""} • ${msg}`;
}

type StatusFilter = Ticket["status"] | "ALL";
type PriorityFilter = Ticket["priority"] | "ALL";

export default function TicketListPage() {
  const nav = useNavigate();
  const currentUser = getCurrentUser();
  const canCreateTicket = currentUser?.role === "REQUESTER";

  const [page, setPage] = useState(0);
  const [size] = useState(10);

  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [priority, setPriority] = useState<PriorityFilter>("ALL");
  const [q, setQ] = useState("");

  const [data, setData] = useState<PageResponse<Ticket> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  const params: TicketListParams = useMemo(
    () => ({
      page,
      size,
      sortField: "createdAt",
      sortDir,
      status: status === "ALL" ? undefined : status,
      priority: priority === "ALL" ? undefined : priority,
      q: q.trim().length > 0 ? q.trim() : undefined,
    }),
    [page, size, sortDir, status, priority, q]
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchTickets(params)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((e) => {
        if (cancelled) return;

        if (e instanceof ApiRequestError) {
          setError(getApiErrorMessage(e));
          return;
        }

        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params, reloadKey]);

  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const empty = !loading && !error && (data?.content.length ?? 0) === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Tickets
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Filter, search, and open ticket details.
            </p>
          </div>

          {canCreateTicket && (
            <button
              type="button"
              onClick={() => nav("/tickets/new")}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              + Create Ticket
            </button>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-600">
                Search
              </label>
              <input
                value={q}
                onChange={(e) => {
                  setPage(0);
                  setQ(e.target.value);
                }}
                placeholder="Search title or description…"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setPage(0);
                  setStatus(e.target.value as StatusFilter);
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
              >
                <option value="ALL">All</option>
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="WAITING_CUSTOMER">WAITING CUSTOMER</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => {
                  setPage(0);
                  setPriority(e.target.value as PriorityFilter);
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
              >
                <option value="ALL">All</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">
                Sort
              </label>
              <select
                value={sortDir}
                onChange={(e) => {
                  setPage(0);
                  setSortDir(e.target.value as "asc" | "desc");
                }}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              {data
                ? `Page ${data.number + 1} / ${totalPages} • Total ${data.totalElements}`
                : loading
                  ? "Loading…"
                  : "—"}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Refresh
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={!data || data.first || loading}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Prev
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!data || data.last || loading}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800 shadow-sm">
            <div className="text-sm font-semibold">Failed to load tickets</div>
            <div className="mt-1 text-sm">{error}</div>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mt-6">
          {loading && (
            <div className="grid gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-5 w-3/5" />
                      <div className="mt-3 flex gap-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-6 w-32 rounded-full" />
                      </div>
                      <div className="mt-3">
                        <Skeleton className="h-4 w-4/5" />
                      </div>
                      <div className="mt-3">
                        <Skeleton className="h-4 w-2/5" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-20 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {empty && (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="text-lg font-semibold text-slate-900">
                No tickets found
              </div>
              <div className="mt-2 text-sm text-slate-600">
                Try changing filters or create a new ticket.
              </div>

              {canCreateTicket && (
                <button
                  type="button"
                  onClick={() => nav("/tickets/new")}
                  className="mt-6 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  + Create Ticket
                </button>
              )}
            </div>
          )}

          {!loading && !error && !empty && (
            <div className="grid gap-3">
              {(data?.content ?? []).map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-500">
                        Ticket #{t.id}
                      </div>

                      <div className="mt-1 truncate text-lg font-semibold text-slate-900">
                        {t.title}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {truncate(t.description, 170)}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge kind="status" value={t.status} />
                        <Badge kind="priority" value={t.priority} />
                        <TeamBadge teamId={t.teamId} />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>Requester #{t.requesterId}</span>
                        <span>
                          Assignee {t.assigneeId ? `#${t.assigneeId}` : "—"}
                        </span>
                        <span>Team #{t.teamId}</span>
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        Opened {formatDate(t.createdAt)} • Last updated{" "}
                        {formatDate(t.updatedAt)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => nav(`/tickets/${t.id}`)}
                      className="inline-flex items-center self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      View <span className="ml-1">→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}