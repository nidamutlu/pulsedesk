import { http } from "./http";

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
  q?: string;
  createdFrom?: string;
  createdTo?: string;
  teamId?: number;
};

export type TicketCreateRequest = {
  title: string;
  description: string;
  priority: TicketPriority;
  teamId: number;
  assigneeId?: number | null;
};

export type TicketTransitionRequest = {
  toStatus: TicketStatus;
};

export type TicketCommentCreateRequest = {
  body: string;
};

function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>
) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function pickSignal(init?: RequestInit) {
  return init?.signal ? { signal: init.signal } : undefined;
}

// ---- Tickets ----

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
    teamId,
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
    q,
    createdFrom,
    createdTo,
    teamId,
  });

  return http<PageResponse<Ticket>>(`/tickets${qs}`, {
    ...(pickSignal(init) ?? {}),
  });
}

export async function fetchTicketById(
  id: number,
  init?: RequestInit
): Promise<Ticket> {
  return http<Ticket>(`/tickets/${id}`, {
    ...(pickSignal(init) ?? {}),
  });
}

export async function createTicket(
  body: TicketCreateRequest,
  init?: RequestInit
): Promise<Ticket> {
  return http<Ticket>("/tickets", {
    method: "POST",
    body,
    ...(pickSignal(init) ?? {}),
  });
}

export async function transitionTicket(
  id: number,
  toStatus: TicketStatus,
  init?: RequestInit
): Promise<Ticket> {
  const payload: TicketTransitionRequest = { toStatus };

  return http<Ticket>(`/tickets/${id}/transition`, {
    method: "POST",
    body: payload,
    ...(pickSignal(init) ?? {}),
  });
}

export async function fetchTicketAuditLogs(
  id: number,
  init?: RequestInit
): Promise<TicketAuditLog[]> {
  return http<TicketAuditLog[]>(`/tickets/${id}/audit-logs`, {
    ...(pickSignal(init) ?? {}),
  });
}

// ---- Comments ----

export async function fetchTicketComments(
  ticketId: number,
  init?: RequestInit
): Promise<TicketComment[]> {
  return http<TicketComment[]>(`/tickets/${ticketId}/comments`, {
    ...(pickSignal(init) ?? {}),
  });
}

export async function createTicketComment(
  ticketId: number,
  body: string,
  init?: RequestInit
): Promise<TicketComment> {
  const payload: TicketCommentCreateRequest = { body };

  return http<TicketComment>(`/tickets/${ticketId}/comments`, {
    method: "POST",
    body: payload,
    ...(pickSignal(init) ?? {}),
  });
}