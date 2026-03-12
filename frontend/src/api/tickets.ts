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

export type TicketSortField = "id" | "createdAt" | "updatedAt" | "priority";

export type TicketListParams = {
  page?: number;
  size?: number;
  sortField?: TicketSortField;
  sortDir?: "asc" | "desc";
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: number;
  teamId?: number;
  q?: string;
  createdFrom?: string;
  createdTo?: string;
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
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function withSignal(init?: RequestInit) {
  return init?.signal ? { signal: init.signal } : {};
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

  const query = buildQuery({
    page,
    size,
    sort: `${sortField},${sortDir}`,
    status,
    priority,
    assigneeId,
    teamId,
    q,
    createdFrom,
    createdTo,
  });

  return http<PageResponse<Ticket>>(`/tickets${query}`, {
    ...withSignal(init),
  });
}

export async function fetchTicketById(
  id: number,
  init?: RequestInit
): Promise<Ticket> {
  return http<Ticket>(`/tickets/${id}`, {
    ...withSignal(init),
  });
}

export async function createTicket(
  body: TicketCreateRequest,
  init?: RequestInit
): Promise<Ticket> {
  return http<Ticket>("/tickets", {
    method: "POST",
    body,
    ...withSignal(init),
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
    ...withSignal(init),
  });
}

export async function fetchTicketAuditLogs(
  id: number,
  init?: RequestInit
): Promise<TicketAuditLog[]> {
  return http<TicketAuditLog[]>(`/tickets/${id}/audit-logs`, {
    ...withSignal(init),
  });
}

// ---- Comments ----

export async function fetchTicketComments(
  ticketId: number,
  init?: RequestInit
): Promise<TicketComment[]> {
  return http<TicketComment[]>(`/tickets/${ticketId}/comments`, {
    ...withSignal(init),
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
    ...withSignal(init),
  });
}