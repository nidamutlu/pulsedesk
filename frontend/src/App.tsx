import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./app/Layout";

import TicketListPage from "./pages/Tickets/TicketListPage";
import TicketCreatePage from "./pages/Tickets/TicketCreatePage";
import TicketDetailPage from "./pages/TicketDetail/TicketDetailPage";
import NotificationsPage from "./pages/Notifications/NotificationsPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/tickets" replace />} />

        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/tickets" element={<TicketListPage />} />
        <Route path="/tickets/new" element={<TicketCreatePage />} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />

        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/tickets" replace />} />
    </Routes>
  );
}