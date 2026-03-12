import React, { useEffect, useMemo, useState } from "react";
import { Navigate, createBrowserRouter, useLocation } from "react-router-dom";

import { getAccessToken } from "../api/auth";

import Layout from "./Layout";

import LoginPage from "../pages/Login/LoginPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import TicketListPage from "../pages/Tickets/TicketListPage";
import TicketCreatePage from "../pages/Tickets/TicketCreatePage";
import TicketDetailPage from "../pages/TicketDetail/TicketDetailPage";
import NotificationsPage from "../pages/Notifications/NotificationsPage";

function useAccessTokenSnapshot() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === "pulsedesk.accessToken" ||
        e.key === "pulsedesk.refreshToken"
      ) {
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

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            404 — Not Found
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            The page you are looking for does not exist.
          </p>
        </div>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
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
        <Layout />
      </RequireAuth>
    ),
    children: [
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "tickets",
        children: [
          {
            index: true,
            element: <TicketListPage />,
          },
          {
            path: "new",
            element: <TicketCreatePage />,
          },
          {
            path: ":id",
            element: <TicketDetailPage />,
          },
        ],
      },
      {
        path: "notifications",
        element: <NotificationsPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);