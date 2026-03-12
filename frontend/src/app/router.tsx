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
  const [version, setVersion] = useState(0);

  useEffect(() => {
    function refreshSnapshot() {
      setVersion((current) => current + 1);
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key === "pulsedesk.accessToken" ||
        event.key === "pulsedesk.refreshToken"
      ) {
        refreshSnapshot();
      }
    }

    function handleAuthChanged() {
      refreshSnapshot();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("auth-changed", handleAuthChanged);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("auth-changed", handleAuthChanged);
    };
  }, []);

  return useMemo(() => {
    void version;
    return getAccessToken();
  }, [version]);
}

function RootRedirect() {
  const token = useAccessTokenSnapshot();
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = useAccessTokenSnapshot();

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <>{children}</>;
}

function RedirectIfAuthenticated({
  children,
}: {
  children: React.ReactNode;
}) {
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
    element: <RootRedirect />,
  },
  {
    path: "/login",
    element: (
      <RedirectIfAuthenticated>
        <LoginPage />
      </RedirectIfAuthenticated>
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