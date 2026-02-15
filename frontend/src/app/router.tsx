import { Navigate, createBrowserRouter } from "react-router-dom";

import LoginPage from "../pages/Login/LoginPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import TicketListPage from "../pages/Tickets/TicketListPage";
import TicketDetailPage from "../pages/TicketDetail/TicketDetailPage";
import NotificationsPage from "../pages/Notifications/NotificationsPage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },

  { path: "/login", element: <LoginPage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/tickets", element: <TicketListPage /> },
  { path: "/tickets/:id", element: <TicketDetailPage /> },
  { path: "/notifications", element: <NotificationsPage /> },

  { path: "*", element: <h1>404 - Not Found</h1> },
]);
