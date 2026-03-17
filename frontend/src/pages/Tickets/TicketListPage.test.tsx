import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/vitest";

import TicketListPage from "./TicketListPage";
import { fetchTickets } from "../../api/tickets";

vi.mock("../../api/auth", () => ({
  getCurrentUser: () => ({ role: "ADMIN" }),
}));

vi.mock("../../api/savedViews", () => ({
  fetchSavedViews: vi.fn().mockResolvedValue([]),
  createSavedView: vi.fn(),
  deleteSavedView: vi.fn(),
}));

vi.mock("../../api/tickets", () => ({
  fetchTickets: vi.fn(),
  exportTicketsCsv: vi.fn(),
  bulkAssignTickets: vi.fn(),
  bulkTransitionTickets: vi.fn(),
}));

const mockedFetchTickets = vi.mocked(fetchTickets);

describe("TicketListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedFetchTickets.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 1,
      number: 0,
      size: 10,
      first: true,
      last: true,
    });
  });

  test("renders tickets page header", async () => {
    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/tickets/i)).toBeInTheDocument();
  });

  test("shows export csv button", async () => {
    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/export csv/i)).toBeInTheDocument();
  });

  test("shows select all checkbox label when tickets exist", async () => {
    mockedFetchTickets.mockResolvedValueOnce({
      content: [
        {
          id: 1,
          title: "SMTP issue",
          description: "Mail delivery problem",
          status: "OPEN",
          priority: "HIGH",
          requesterId: 1,
          assigneeId: 2,
          teamId: 1,
          createdAt: "2026-03-16T10:00:00Z",
          updatedAt: "2026-03-16T10:00:00Z",
          resolvedAt: null,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
      first: true,
      last: true,
    });

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/select all tickets on this page/i)
    ).toBeInTheDocument();
  });

  test("shows bulk action bar when a ticket is selected", async () => {
    mockedFetchTickets.mockResolvedValueOnce({
      content: [
        {
          id: 1,
          title: "SMTP issue",
          description: "Mail delivery problem",
          status: "OPEN",
          priority: "HIGH",
          requesterId: 1,
          assigneeId: 2,
          teamId: 1,
          createdAt: "2026-03-16T10:00:00Z",
          updatedAt: "2026-03-16T10:00:00Z",
          resolvedAt: null,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
      first: true,
      last: true,
    });

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>
    );

    const checkboxes = await screen.findAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    expect(await screen.findByText(/^Bulk assign$/i)).toBeInTheDocument();
    expect(await screen.findByText(/^Bulk transition$/i)).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /clear selection/i })
    ).toBeInTheDocument();
  });
});