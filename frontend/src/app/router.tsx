import React, { useEffect, useMemo, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  createBrowserRouter,
  useLocation,
} from "react-router-dom";

import { getAccessToken } from "../api/auth";

import LoginPage from "../pages/Login/LoginPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import TicketListPage from "../pages/Tickets/TicketListPage";
import TicketCreatePage from "../pages/Tickets/TicketCreatePage";
import TicketDetailPage from "../pages/TicketDetail/TicketDetailPage";
import NotificationsPage from "../pages/Notifications/NotificationsPage";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function useAccessTokenSnapshot() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "pulsedesk.accessToken" || e.key === "pulsedesk.refreshToken") {
        setTick((t) => t + 1);
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return useMemo(() => {
    void tick;
    return getAccessToken();
  }, [tick]);
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const token = useAccessTokenSnapshot();

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${loc.pathname}${loc.search}` }}
      />
    );
  }

  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const token = useAccessTokenSnapshot();
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppLayout() {
  const loc = useLocation();
  const isTicketsArea = loc.pathname.startsWith("/tickets");
  const isCreateTicket = loc.pathname === "/tickets/new";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm font-semibold text-slate-900">
              PulseDesk
            </Link>

            <nav className="flex items-center gap-3 text-sm">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  cx(
                    "rounded-lg px-2 py-1",
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  )
                }
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/tickets"
                className={({ isActive }) =>
                  cx(
                    "rounded-lg px-2 py-1",
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  )
                }
              >
                Tickets
              </NavLink>

              <NavLink
                to="/notifications"
                className={({ isActive }) =>
                  cx(
                    "rounded-lg px-2 py-1",
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  )
                }
              >
                Notifications
              </NavLink>
            </nav>
          </div>

          {isTicketsArea && !isCreateTicket && (
            <Link
              to="/tickets/new"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              + New Ticket
            </Link>
          )}
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">404 — Not Found</h1>
          <p className="mt-2 text-sm text-slate-600">
            The page you are looking for does not exist.
          </p>

          <div className="mt-6 flex gap-3">
            <Link
              to="/dashboard"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Go to Dashboard
            </Link>
            <Link
              to="/tickets"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Go to Tickets
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },

  {
    path: "/login",
    element: (
      <RedirectIfAuthed>
        <LoginPage />
      </RedirectIfAuthed>
    ),
  },

  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: "dashboard", element: <DashboardPage /> },

      {
        path: "tickets",
        children: [
          { index: true, element: <TicketListPage /> },
          { path: "new", element: <TicketCreatePage /> },
          { path: ":id", element: <TicketDetailPage /> },
        ],
      },

      { path: "notifications", element: <NotificationsPage /> },

      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);