import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiRequestError, fetchTickets } from "../../api/tickets";
import type { PageResponse, Ticket } from "../../api/tickets";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
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

  return <span className={cx(base, cls)}>{value}</span>;
}

function Skeleton({ className }: { className: string }) {
  return <div className={cx("animate-pulse rounded bg-slate-100", className)} />;
}

function buildApiErrorMessage(e: ApiRequestError) {
  const details =
    e.payload?.details && Object.keys(e.payload.details).length > 0
      ? ` • ${JSON.stringify(e.payload.details)}`
      : "";
  return `${e.status} • ${e.code}: ${e.message}${details}`;
}

export default function TicketListPage() {
  const nav = useNavigate();

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [data, setData] = useState<PageResponse<Ticket> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const params = useMemo(
    () => ({
      page,
      size,
      sortField: "createdAt" as const,
      sortDir,
    }),
    [page, size, sortDir]
  );

  useEffect(() => {
    const ac = new AbortController();

    setLoading(true);
    setError(null);

    fetchTickets(params, { signal: ac.signal })
      .then((res) => setData(res))
      .catch((e) => {
        if (ac.signal.aborted) return;

        if (e instanceof ApiRequestError) {
          setError(buildApiErrorMessage(e));
          return;
        }

        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [params, reloadKey]);

  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const empty = !loading && !error && (data?.content.length ?? 0) === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Tickets
          </h1>
          <p className="text-sm text-slate-600">
            Browse, sort, and open ticket details.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm font-medium text-slate-700">
              Sort by createdAt
            </div>

            <select
              value={sortDir}
              onChange={(e) => {
                setPage(0);
                setSortDir(e.target.value as "asc" | "desc");
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>

            <div className="text-sm text-slate-600">
              {data
                ? `Page ${data.number + 1} / ${totalPages} • Total ${
                    data.totalElements
                  }`
                : loading
                  ? "Loading…"
                  : "—"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!data || data.first || loading}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Prev
            </button>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data || data.last || loading}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
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
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-5 w-3/5" />
                      <div className="mt-3 flex gap-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-24 rounded-full" />
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
                No tickets yet
              </div>
              <div className="mt-2 text-sm text-slate-600">
                Create your first ticket to start tracking issues.
              </div>
              <button
                onClick={() => nav("/tickets/new")}
                className="mt-6 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                + Create Ticket
              </button>
            </div>
          )}

          {!loading && !error && !empty && (
            <div className="grid gap-3">
              {(data?.content ?? []).map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-500">
                        Ticket #{t.id}
                      </div>
                      <div className="mt-1 truncate text-lg font-semibold text-slate-900">
                        {t.title}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge kind="status" value={t.status} />
                        <Badge kind="priority" value={t.priority} />
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        Created {formatDate(t.createdAt)} • Updated{" "}
                        {formatDate(t.updatedAt)}
                      </div>
                    </div>

                    <button
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