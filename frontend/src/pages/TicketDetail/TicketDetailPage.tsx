import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiRequestError } from "../../api/http";
import {
  createTicketComment,
  fetchTicketAuditLogs,
  fetchTicketById,
  fetchTicketComments,
  transitionTicket,
} from "../../api/tickets";
import type {
  Ticket,
  TicketAuditLog,
  TicketComment,
  TicketStatus,
} from "../../api/tickets";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatDateTime(iso?: string | null) {
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

function labelStatus(s: TicketStatus) {
  return s.replaceAll("_", " ");
}

function actorLabel(actorId: number) {
  if (!Number.isFinite(actorId) || actorId <= 0) return "System";
  return `User #${actorId}`;
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

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function getApiErrorMessage(e: ApiRequestError) {
  const d = e.details as any;

  const code =
    d && typeof d === "object" && typeof d.code === "string" ? d.code : null;

  const msg =
    d && typeof d === "object" && typeof d.message === "string"
      ? d.message
      : e.message;

  return `${e.status}${code ? ` • ${code}` : ""} • ${msg}`;
}

function sortAuditNewestFirst(logs: TicketAuditLog[]) {
  return [...logs].sort((a, b) => {
    const ta = Date.parse(a.createdAt);
    const tb = Date.parse(b.createdAt);
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return tb - ta;
  });
}

function isInvalidTransitionError(e: ApiRequestError) {
  if (e.status === 409) return true;
  const d = e.details as any;
  if (d && typeof d === "object" && d.code === "TICKET_TRANSITION_INVALID") return true;
  return false;
}

function allowedNextStatuses(from: TicketStatus): TicketStatus[] {
  switch (from) {
    case "OPEN":
      return ["IN_PROGRESS"];
    case "IN_PROGRESS":
      return ["WAITING_CUSTOMER", "RESOLVED"];
    case "WAITING_CUSTOMER":
      return ["IN_PROGRESS", "RESOLVED"];
    case "RESOLVED":
      return ["CLOSED", "IN_PROGRESS"];
    case "CLOSED":
      return [];
    default:
      return [];
  }
}

function auditLineText(l: TicketAuditLog) {
  if (l.action === "STATUS_CHANGE") {
    const from = (l.oldStatus ?? "—").replaceAll("_", " ");
    const to = (l.newStatus ?? "—").replaceAll("_", " ");
    return `Status: ${from} → ${to}`;
  }

  if (l.action === "ASSIGNEE_CHANGE") {
    const from = l.oldAssigneeId === null ? "Unassigned" : String(l.oldAssigneeId);
    const to = l.newAssigneeId === null ? "Unassigned" : String(l.newAssigneeId);
    return `Assignee: ${from} → ${to}`;
  }

  return l.action;
}

export default function TicketDetailPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();

  const ticketId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [id]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<TicketAuditLog[] | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comments, setComments] = useState<TicketComment[] | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const [commentBody, setCommentBody] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentSaveError, setCommentSaveError] = useState<string | null>(null);

  const [transitionOpen, setTransitionOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<TicketStatus | "">("");
  const [transitionSaving, setTransitionSaving] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const statusOptions: TicketStatus[] = useMemo(() => {
    if (!ticket) return [];
    return allowedNextStatuses(ticket.status);
  }, [ticket]);

  useEffect(() => {
    if (!ticket) return;
    setNextStatus(statusOptions[0] ?? "");
  }, [ticket?.id, ticket?.status, statusOptions]);

  const loadAudit = useCallback(async (idNum: number) => {
    setAuditError(null);
    setAuditLoading(true);

    try {
      const logs = await fetchTicketAuditLogs(idNum);
      if (!mountedRef.current) return;
      setAuditLogs(sortAuditNewestFirst(logs));
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      if (e instanceof ApiRequestError) setAuditError(getApiErrorMessage(e));
      else setAuditError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setAuditLoading(false);
    }
  }, []);

  const loadComments = useCallback(async (idNum: number) => {
    setCommentsError(null);
    setCommentsLoading(true);

    try {
      const list = await fetchTicketComments(idNum);
      if (!mountedRef.current) return;
      setComments(list);
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      if (e instanceof ApiRequestError) setCommentsError(getApiErrorMessage(e));
      else setCommentsError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setCommentsLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setTicket(null);
    setNotFound(false);
    setError(null);

    setAuditLogs(null);
    setAuditError(null);

    setComments(null);
    setCommentsError(null);

    if (ticketId === null) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);

    try {
      const t = await fetchTicketById(ticketId);
      if (!mountedRef.current) return;

      setTicket(t);
      void loadAudit(t.id);
      void loadComments(t.id);
    } catch (e: unknown) {
      if (!mountedRef.current) return;

      if (e instanceof ApiRequestError) {
        if (e.status === 404) {
          setNotFound(true);
          return;
        }
        setError(getApiErrorMessage(e));
        return;
      }

      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [ticketId, loadAudit, loadComments]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openTransition = useCallback(() => {
    setTransitionError(null);
    setTransitionOpen(true);
  }, []);

  const closeTransition = useCallback(() => {
    setTransitionError(null);
    setTransitionOpen(false);
    setNextStatus(statusOptions[0] ?? "");
  }, [statusOptions]);

  const applyTransition = useCallback(async () => {
    if (!ticket || ticketId === null) return;

    if (!nextStatus) {
      setTransitionError("Please select a target status.");
      return;
    }

    setTransitionSaving(true);
    setTransitionError(null);

    try {
      await transitionTicket(ticketId, nextStatus);
      if (!mountedRef.current) return;

      const fresh = await fetchTicketById(ticketId);
      if (!mountedRef.current) return;

      setTicket(fresh);
      setTransitionOpen(false);
      setNextStatus("");

      void loadAudit(fresh.id);
    } catch (e: unknown) {
      if (!mountedRef.current) return;

      if (e instanceof ApiRequestError) {
        if (isInvalidTransitionError(e)) {
          setTransitionError("This status transition is not allowed for the current ticket.");
          return;
        }
        setTransitionError(getApiErrorMessage(e));
        return;
      }

      setTransitionError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setTransitionSaving(false);
    }
  }, [ticket, ticketId, nextStatus, loadAudit]);

  const submitComment = useCallback(async () => {
    if (!ticket || ticketId === null) return;

    const body = commentBody.trim();
    if (!body) {
      setCommentSaveError("Please write a comment.");
      return;
    }

    setCommentSaving(true);
    setCommentSaveError(null);

    try {
      await createTicketComment(ticketId, body);
      if (!mountedRef.current) return;

      setCommentBody("");
      void loadComments(ticketId);
    } catch (e: unknown) {
      if (!mountedRef.current) return;

      if (e instanceof ApiRequestError) setCommentSaveError(getApiErrorMessage(e));
      else setCommentSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setCommentSaving(false);
    }
  }, [ticket, ticketId, commentBody, loadComments]);

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
            <h1 className="text-2xl font-semibold text-slate-900">Ticket not found</h1>
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
          <Link to="/tickets" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Back to Tickets
          </Link>

          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
            <div className="text-sm font-semibold">Failed to load ticket</div>
            <div className="mt-2 text-sm">{error}</div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => void loadAll()}
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
        <div className="flex items-center justify-between gap-3">
          <Link to="/tickets" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Back to Tickets
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openTransition}
              disabled={loading || !t || statusOptions.length === 0}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              title={statusOptions.length === 0 ? "No transitions available" : "Change status"}
            >
              Change Status
            </button>
          </div>
        </div>

        {transitionOpen && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Status Transition</div>
                <div className="mt-1 text-sm text-slate-600">
                  Current:{" "}
                  <span className="font-semibold text-slate-900">
                    {t ? labelStatus(t.status) : "—"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as TicketStatus | "")}
                  disabled={transitionSaving}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400 disabled:opacity-60"
                >
                  {statusOptions.length === 0 ? (
                    <option value="">No options</option>
                  ) : (
                    statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {labelStatus(s)}
                      </option>
                    ))
                  )}
                </select>

                <button
                  type="button"
                  onClick={applyTransition}
                  disabled={transitionSaving || !nextStatus}
                  className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {transitionSaving ? "Applying..." : "Apply"}
                </button>

                <button
                  type="button"
                  onClick={closeTransition}
                  disabled={transitionSaving}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>

            {transitionError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {transitionError}
              </div>
            )}
          </div>
        )}

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
                <Skeleton className="h-5 w-44" />
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

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Description</div>

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

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">Comments</div>

                <button
                  type="button"
                  onClick={() => (t ? void loadComments(t.id) : undefined)}
                  disabled={!t || commentsLoading || commentSaving}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {commentsLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              <div className="mt-4">
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  disabled={!t || commentSaving}
                  rows={3}
                  placeholder="Write a comment… (use @someone to mention)"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 disabled:opacity-60"
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">{commentBody.trim().length}/5000</div>

                  <button
                    type="button"
                    onClick={submitComment}
                    disabled={!t || commentSaving || !commentBody.trim()}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {commentSaving ? "Posting..." : "Post comment"}
                  </button>
                </div>

                {commentSaveError && (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {commentSaveError}
                  </div>
                )}

                <div className="mt-5">
                  {commentsError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                      {commentsError}
                    </div>
                  ) : !comments || comments.length === 0 ? (
                    <div className="text-sm text-slate-600">
                      {commentsLoading ? "Loading comments..." : "No comments yet."}
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {comments.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900">
                                {actorLabel(c.authorId)}
                              </div>
                              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                                {c.body}
                              </div>
                            </div>
                            <div className="shrink-0 text-xs font-medium text-slate-500">
                              {formatDateTime(c.createdAt)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">Activity</div>

                <button
                  type="button"
                  onClick={() => (t ? void loadAudit(t.id) : undefined)}
                  disabled={!t || auditLoading || transitionSaving}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {auditLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              <div className="mt-4">
                {auditError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {auditError}
                  </div>
                ) : !auditLogs || auditLogs.length === 0 ? (
                  <div className="text-sm text-slate-600">
                    {auditLoading ? "Loading activity..." : "No activity yet."}
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {auditLogs.map((l) => (
                      <li
                        key={l.id}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">
                              {auditLineText(l)}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              {actorLabel(l.actorId)}
                            </div>
                          </div>
                          <div className="shrink-0 text-xs font-medium text-slate-500">
                            {formatDateTime(l.createdAt)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

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
                  value={loading || !t ? <Skeleton className="h-5 w-16" /> : t.requesterId}
                />
                <DetailItem
                  label="Assignee ID"
                  value={
                    loading || !t ? (
                      <Skeleton className="h-5 w-24" />
                    ) : t.assigneeId === null ? (
                      "Unassigned"
                    ) : (
                      t.assigneeId
                    )
                  }
                />
                <DetailItem
                  label="Team ID"
                  value={loading || !t ? <Skeleton className="h-5 w-12" /> : t.teamId}
                />

                <div className="my-1 h-px bg-slate-100" />

                <DetailItem
                  label="Created At"
                  value={loading || !t ? <Skeleton className="h-5 w-44" /> : formatDateTime(t.createdAt)}
                />
                <DetailItem
                  label="Updated At"
                  value={loading || !t ? <Skeleton className="h-5 w-44" /> : formatDateTime(t.updatedAt)}
                />
                <DetailItem
                  label="Resolved At"
                  value={
                    loading || !t ? (
                      <Skeleton className="h-5 w-44" />
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
                Use <span className="font-semibold text-slate-900">@someone</span> in a comment to mention a user.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}