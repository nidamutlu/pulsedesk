export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";

export type Ticket = {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId: number;
  assigneeId: number | null;
  teamId: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type TicketAuditAction = "STATUS_CHANGE" | "ASSIGNEE_CHANGE";

export type TicketAuditLog = {
  id: number;
  action: TicketAuditAction;
  oldStatus: TicketStatus | null;
  newStatus: TicketStatus | null;
  oldAssigneeId: number | null;
  newAssigneeId: number | null;
  actorId: number;
  createdAt: string;
};

export type TicketComment = {
  id: number;
  ticketId: number;
  authorId: number;
  body: string;
  createdAt: string;
};

export type TicketCommentCreateRequest = {
  body: string;
  authorId: number;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
};

export type TicketListParams = {
  page?: number;
  size?: number;
  sortField?: "createdAt" | "updatedAt" | "priority";
  sortDir?: "asc" | "desc";
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: number;
  tag?: string;
  q?: string;
  createdFrom?: string;
  createdTo?: string;
};

export type TicketCreateRequest = {
  title: string;
  description: string;
  priority: TicketPriority;
  requesterId: number;
  teamId: number;
  assigneeId?: number | null;
};

export type TicketTransitionRequest = {
  toStatus: TicketStatus;
};

export type ApiError = {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
};

/**
 * Client-facing error codes.
 */
export type ApiErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "CONFLICT"
  | "TICKET_TRANSITION_INVALID"
  | "FAILED";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly payload?: ApiError;

  constructor(
    code: ApiErrorCode,
    status: number,
    message: string,
    payload?: ApiError
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.payload = payload;
  }
}

const BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env &&
    (import.meta as any).env.VITE_API_BASE_URL) ||
  "http://localhost:8080";

// ---------- Helpers ----------

function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>
) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

async function safeJson<T>(res: Response): Promise<T | undefined> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return undefined;
  try {
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}

function mapStatusToCode(status: number): ApiErrorCode {
  if (status === 404) return "NOT_FOUND";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 409) return "CONFLICT";
  if (status === 400) return "VALIDATION";
  return "FAILED";
}

function isApiErrorCode(code: unknown): code is ApiErrorCode {
  return (
    code === "NOT_FOUND" ||
    code === "UNAUTHORIZED" ||
    code === "FORBIDDEN" ||
    code === "VALIDATION" ||
    code === "CONFLICT" ||
    code === "TICKET_TRANSITION_INVALID" ||
    code === "FAILED"
  );
}

function mergeHeaders(init?: RequestInit): HeadersInit {
  const base: Record<string, string> = { Accept: "application/json" };

  if (!init?.headers) return base;

  if (init.headers instanceof Headers) {
    const out: Record<string, string> = { ...base };
    init.headers.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }

  if (Array.isArray(init.headers)) {
    const out: Record<string, string> = { ...base };
    for (const [k, v] of init.headers) out[k] = v;
    return out;
  }

  return { ...base, ...(init.headers as Record<string, string>) };
}

function withJsonContentType(init?: RequestInit): HeadersInit {
  return mergeHeaders({
    ...init,
    headers: { ...(init?.headers as any), "Content-Type": "application/json" },
  });
}

function joinUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = joinUrl(BASE_URL, path);

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: mergeHeaders(init),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ApiRequestError("FAILED", 0, `Network error: ${msg}`);
  }

  if (res.ok) {
    const data = await safeJson<T>(res);
    if (data === undefined) {
      throw new ApiRequestError("FAILED", res.status, "Expected JSON response");
    }
    return data;
  }

  const payload = await safeJson<ApiError>(res);

  const mapped = mapStatusToCode(res.status);
  const backendCode = payload?.code;

  const code: ApiErrorCode = isApiErrorCode(backendCode) ? backendCode : mapped;

  const message =
    payload?.message ||
    (code === "NOT_FOUND"
      ? "Resource not found"
      : code === "VALIDATION"
        ? "Validation failed"
        : code === "UNAUTHORIZED"
          ? "Unauthorized"
          : code === "FORBIDDEN"
            ? "Forbidden"
            : "Request failed");

  throw new ApiRequestError(code, res.status, message, payload);
}

function assertPositiveId(id: number) {
  if (!Number.isFinite(id) || id <= 0) {
    throw new ApiRequestError("VALIDATION", 0, "Invalid ticket id");
  }
}

function requireNonBlank(value: string, fieldName: string) {
  if (!value || value.trim().length === 0) {
    throw new ApiRequestError("VALIDATION", 0, `${fieldName} is required`);
  }
}

// ---------- API ----------

export async function fetchTickets(
  params: TicketListParams = {},
  init?: RequestInit
): Promise<PageResponse<Ticket>> {
  const {
    page = 0,
    size = 10,
    sortField = "createdAt",
    sortDir = "desc",
    status,
    priority,
    assigneeId,
    tag,
    q,
    createdFrom,
    createdTo,
  } = params;

  const qs = buildQuery({
    page,
    size,
    sort: `${sortField},${sortDir}`,
    status,
    priority,
    assigneeId,
    tag,
    q,
    createdFrom,
    createdTo,
  });

  return requestJson<PageResponse<Ticket>>(`/tickets${qs}`, init);
}

export async function fetchTicketById(
  id: number,
  init?: RequestInit
): Promise<Ticket> {
  assertPositiveId(id);
  return requestJson<Ticket>(`/tickets/${id}`, init);
}

export async function createTicket(
  body: TicketCreateRequest,
  init?: RequestInit
): Promise<Ticket> {
  requireNonBlank(body.title, "title");
  requireNonBlank(body.description, "description");

  return requestJson<Ticket>("/tickets", {
    ...init,
    method: "POST",
    headers: withJsonContentType(init),
    body: JSON.stringify({
      ...body,
      title: body.title.trim(),
      description: body.description.trim(),
    }),
  });
}

export async function transitionTicket(
  id: number,
  toStatus: TicketStatus,
  init?: RequestInit
): Promise<Ticket> {
  assertPositiveId(id);

  const payload: TicketTransitionRequest = { toStatus };

  return requestJson<Ticket>(`/tickets/${id}/transition`, {
    ...init,
    method: "POST",
    headers: withJsonContentType(init),
    body: JSON.stringify(payload),
  });
}

export async function fetchTicketAuditLogs(
  id: number,
  init?: RequestInit
): Promise<TicketAuditLog[]> {
  assertPositiveId(id);
  return requestJson<TicketAuditLog[]>(`/tickets/${id}/audit-logs`, init);
}

// ---------- Comments ----------

export async function fetchTicketComments(
  ticketId: number,
  init?: RequestInit
): Promise<TicketComment[]> {
  assertPositiveId(ticketId);
  return requestJson<TicketComment[]>(`/tickets/${ticketId}/comments`, init);
}

export async function createTicketComment(
  ticketId: number,
  body: string,
  authorId: number,
  init?: RequestInit
): Promise<TicketComment> {
  assertPositiveId(ticketId);
  requireNonBlank(body, "body");

  const payload: TicketCommentCreateRequest = { body: body.trim(), authorId };

  return requestJson<TicketComment>(`/tickets/${ticketId}/comments`, {
    ...init,
    method: "POST",
    headers: withJsonContentType(init),
    body: JSON.stringify(payload),
  });
}