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

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
};

const BASE_URL = "http://localhost:8080";

export async function fetchTickets(
  page = 0,
  size = 10
): Promise<PageResponse<Ticket>> {
  const res = await fetch(
    `${BASE_URL}/tickets?page=${page}&size=${size}&sort=createdAt,desc`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch tickets");
  }

  return res.json();
}

export async function fetchTicketById(id: number): Promise<Ticket> {
  const res = await fetch(`${BASE_URL}/tickets/${id}`);

  if (!res.ok) {
    throw new Error("Ticket not found");
  }

  return res.json();
}