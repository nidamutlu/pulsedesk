import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { getCurrentUser } from "../../api/auth";
import { ApiRequestError } from "../../api/http";
import {
  createSavedView,
  deleteSavedView,
  fetchSavedViews,
} from "../../api/savedViews";
import type { SavedView } from "../../api/savedViews";
import {
  bulkAssignTickets,
  bulkTransitionTickets,
  exportTicketsCsv,
  fetchTickets,
} from "../../api/tickets";
import type {
  BulkActionResponse,
  PageResponse,
  Ticket,
  TicketListParams,
} from "../../api/tickets";

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

type SavedFilterPayload = {
  status?: Ticket["status"];
  priority?: Ticket["priority"];
  query?: string;
  sort?: string;
};

function buildSavedFilterPayload(input: {
  status: StatusFilter;
  priority: PriorityFilter;
  q: string;
  sortDir: "asc" | "desc";
}): SavedFilterPayload {
  return {
    ...(input.status !== "ALL" ? { status: input.status } : {}),
    ...(input.priority !== "ALL" ? { priority: input.priority } : {}),
    ...(input.q.trim() ? { query: input.q.trim() } : {}),
    ...(input.sortDir ? { sort: `createdAt,${input.sortDir}` } : {}),
  };
}

function parseSavedFilterJson(filterJson: string): SavedFilterPayload {
  return JSON.parse(filterJson) as SavedFilterPayload;
}

function parseSortDirection(sort?: string): "asc" | "desc" {
  if (!sort) return "desc";
  return sort.toLowerCase().endsWith(",asc") ? "asc" : "desc";
}

function buildBulkResultMessage(result: BulkActionResponse) {
  const success = result.successCount ?? 0;
  const failed = result.failureCount ?? 0;
  const total = result.totalCount ?? success + failed;

  if (result.message?.trim()) {
    return `${result.message} • ${success}/${total} successful${
      failed > 0 ? ` • ${failed} failed` : ""
    }`;
  }

  if (failed === 0) {
    return `${success} ticket${success === 1 ? "" : "s"} updated successfully.`;
  }

  if (success === 0) {
    return `No tickets were updated. ${failed} failed.`;
  }

  return `${success} ticket${success === 1 ? "" : "s"} updated, ${failed} failed.`;
}

export default function TicketListPage() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentUser = getCurrentUser();
  const canCreateTicket = currentUser?.role === "REQUESTER";

  const [page, setPage] = useState(Number(searchParams.get("page") ?? 0));
  const [size] = useState(10);

  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    searchParams.get("sortDir") === "asc" ? "asc" : "desc"
  );
  const [status, setStatus] = useState<StatusFilter>(
    (searchParams.get("status") as StatusFilter) || "ALL"
  );
  const [priority, setPriority] = useState<PriorityFilter>(
    (searchParams.get("priority") as PriorityFilter) || "ALL"
  );
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [savedViewsLoading, setSavedViewsLoading] = useState(true);
  const [selectedSavedViewId, setSelectedSavedViewId] = useState("");

  const [data, setData] = useState<PageResponse<Ticket> | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  const [selectedTicketIds, setSelectedTicketIds] = useState<number[]>([]);
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const [bulkStatus, setBulkStatus] = useState<Ticket["status"] | "">("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

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

  const tickets = data?.content ?? [];
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const empty = !loading && !error && tickets.length === 0;

  const pageTicketIds = tickets.map((ticket) => ticket.id);
  const allPageSelected =
    pageTicketIds.length > 0 &&
    pageTicketIds.every((id) => selectedTicketIds.includes(id));

  useEffect(() => {
    let cancelled = false;

    setSavedViewsLoading(true);

    fetchSavedViews()
      .then((res) => {
        if (cancelled) return;
        setSavedViews(res);
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
          setSavedViewsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();

    if (page > 0) next.set("page", String(page));
    if (status !== "ALL") next.set("status", status);
    if (priority !== "ALL") next.set("priority", priority);
    if (q.trim()) next.set("q", q.trim());
    if (sortDir !== "desc") next.set("sortDir", sortDir);

    setSearchParams(next, { replace: true });
  }, [page, status, priority, q, sortDir, setSearchParams]);

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

  useEffect(() => {
    setSelectedTicketIds([]);
    setBulkAssigneeId("");
    setBulkStatus("");
    setBulkMessage(null);
    setBulkError(null);
  }, [page, status, priority, q, sortDir]);

  function clearBulkSelection() {
    setSelectedTicketIds([]);
    setBulkAssigneeId("");
    setBulkStatus("");
  }

  function toggleTicketSelection(ticketId: number) {
    setSelectedTicketIds((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  }

  function toggleSelectAllOnPage() {
    if (allPageSelected) {
      setSelectedTicketIds((prev) =>
        prev.filter((id) => !pageTicketIds.includes(id))
      );
      return;
    }

    setSelectedTicketIds((prev) =>
      Array.from(new Set([...prev, ...pageTicketIds]))
    );
  }

  async function handleExportCsv() {
    try {
      setExporting(true);
      setError(null);
      await exportTicketsCsv(params);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setError(getApiErrorMessage(e));
        return;
      }

      setError(e instanceof Error ? e.message : "CSV export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleSaveCurrentView() {
    const name = window.prompt("Saved view name");
    if (!name || !name.trim()) {
      return;
    }

    try {
      setError(null);

      const created = await createSavedView({
        name: name.trim(),
        filterJson: JSON.stringify(
          buildSavedFilterPayload({
            status,
            priority,
            q,
            sortDir,
          })
        ),
      });

      setSavedViews((prev) => [created, ...prev]);
      setSelectedSavedViewId(String(created.id));
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setError(getApiErrorMessage(e));
        return;
      }

      setError(e instanceof Error ? e.message : "Failed to save view");
    }
  }

  function handleSavedViewSelect(viewId: string) {
    setSelectedSavedViewId(viewId);

    if (!viewId) {
      return;
    }

    const selected = savedViews.find((view) => String(view.id) === viewId);
    if (!selected) {
      return;
    }

    try {
      const parsed = parseSavedFilterJson(selected.filterJson);

      setPage(0);
      setStatus(parsed.status ?? "ALL");
      setPriority(parsed.priority ?? "ALL");
      setQ(parsed.query ?? "");
      setSortDir(parseSortDirection(parsed.sort));
    } catch {
      setError("Saved view could not be applied");
    }
  }

  async function handleDeleteCurrentView() {
    if (!selectedSavedViewId) {
      return;
    }

    try {
      setError(null);
      await deleteSavedView(Number(selectedSavedViewId));

      setSavedViews((prev) =>
        prev.filter((view) => String(view.id) !== selectedSavedViewId)
      );
      setSelectedSavedViewId("");
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setError(getApiErrorMessage(e));
        return;
      }

      setError(e instanceof Error ? e.message : "Failed to delete view");
    }
  }

  async function handleBulkAssign() {
    if (selectedTicketIds.length === 0) {
      setBulkError("Select at least one ticket.");
      return;
    }

    const assigneeId = Number(bulkAssigneeId);
    if (!Number.isInteger(assigneeId) || assigneeId <= 0) {
      setBulkError("Enter a valid assignee id.");
      return;
    }

    try {
      setBulkLoading(true);
      setBulkError(null);
      setBulkMessage(null);

      const result = await bulkAssignTickets({
        ticketIds: selectedTicketIds,
        assigneeId,
      });

      setBulkMessage(buildBulkResultMessage(result));
      clearBulkSelection();
      setReloadKey((k) => k + 1);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setBulkError(getApiErrorMessage(e));
        return;
      }

      setBulkError(e instanceof Error ? e.message : "Bulk assign failed");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkTransition() {
    if (selectedTicketIds.length === 0) {
      setBulkError("Select at least one ticket.");
      return;
    }

    if (!bulkStatus) {
      setBulkError("Select a valid status.");
      return;
    }

    try {
      setBulkLoading(true);
      setBulkError(null);
      setBulkMessage(null);

      const result = await bulkTransitionTickets({
        ticketIds: selectedTicketIds,
        status: bulkStatus,
      });

      setBulkMessage(buildBulkResultMessage(result));
      clearBulkSelection();
      setReloadKey((k) => k + 1);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setBulkError(getApiErrorMessage(e));
        return;
      }

      setBulkError(e instanceof Error ? e.message : "Bulk transition failed");
    } finally {
      setBulkLoading(false);
    }
  }

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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={loading || exporting}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>

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

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-end">
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Saved Views
                </label>
                <select
                  value={selectedSavedViewId}
                  onChange={(e) => handleSavedViewSelect(e.target.value)}
                  disabled={savedViewsLoading}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {savedViewsLoading ? "Loading..." : "Select saved view"}
                  </option>
                  {savedViews.map((view) => (
                    <option key={view.id} value={view.id}>
                      {view.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCurrentView}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Save current view
                </button>

                <button
                  type="button"
                  onClick={handleDeleteCurrentView}
                  disabled={!selectedSavedViewId}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Delete selected view
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Save current filters and reload them later.
            </div>
          </div>

          {bulkMessage && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
              <div className="font-semibold">Bulk action completed</div>
              <div className="mt-1">{bulkMessage}</div>
            </div>
          )}

          {bulkError && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
              <div className="font-semibold">Bulk action failed</div>
              <div className="mt-1">{bulkError}</div>
            </div>
          )}

          {selectedTicketIds.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-300 bg-slate-900 p-4 text-white shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {selectedTicketIds.length} ticket selected
                  </div>
                  <div className="mt-1 text-xs text-slate-300">
                    Apply a bulk assign or bulk status update to the selected
                    tickets.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearBulkSelection}
                  className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Clear selection
                </button>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <div className="mb-2 text-sm font-semibold text-white">
                    Bulk assign
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={bulkAssigneeId}
                      onChange={(e) => setBulkAssigneeId(e.target.value)}
                      placeholder="Assignee ID"
                      className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-slate-400"
                    />

                    <button
                      type="button"
                      onClick={handleBulkAssign}
                      disabled={bulkLoading}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {bulkLoading ? "Applying..." : "Assign"}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                  <div className="mb-2 text-sm font-semibold text-white">
                    Bulk transition
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={bulkStatus}
                      onChange={(e) =>
                        setBulkStatus(e.target.value as Ticket["status"] | "")
                      }
                      className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
                    >
                      <option value="">Select status</option>
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="WAITING_CUSTOMER">WAITING CUSTOMER</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleBulkTransition}
                      disabled={bulkLoading}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {bulkLoading ? "Applying..." : "Apply"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
              <div className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAllOnPage}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Select all tickets on this page
                </label>

                <div className="text-xs text-slate-500">
                  {selectedTicketIds.length} selected
                </div>
              </div>

              {tickets.map((t) => (
                <div
                  key={t.id}
                  className={cx(
                    "rounded-2xl border bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md",
                    selectedTicketIds.includes(t.id)
                      ? "border-slate-900 ring-1 ring-slate-200"
                      : "border-slate-200"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedTicketIds.includes(t.id)}
                        onChange={() => toggleTicketSelection(t.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />

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