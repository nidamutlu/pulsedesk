import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";
import { Link } from "react-router-dom";

import LoginPage from "../pages/Login/LoginPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import TicketListPage from "../pages/Tickets/TicketListPage";
import TicketCreatePage from "../pages/Tickets/TicketCreatePage";
import TicketDetailPage from "../pages/TicketDetail/TicketDetailPage";
import NotificationsPage from "../pages/Notifications/NotificationsPage";

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm font-semibold text-slate-900">
              PulseDesk
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link to="/dashboard" className="text-slate-600 hover:text-slate-900">
                Dashboard
              </Link>
              <Link to="/tickets" className="text-slate-600 hover:text-slate-900">
                Tickets
              </Link>
              <Link to="/notifications" className="text-slate-600 hover:text-slate-900">
                Notifications
              </Link>
            </nav>
          </div>

          <Link
            to="/tickets/new"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            + New Ticket
          </Link>
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
  { path: "/", element: <Navigate to="/dashboard" replace /> },

  // Public
  { path: "/login", element: <LoginPage /> },

  // App (with shared layout)
  {
    path: "/",
    element: <AppLayout />,
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