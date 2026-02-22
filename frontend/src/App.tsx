import { Navigate, Route, Routes } from "react-router-dom";

import TicketListPage from "./pages/Tickets/TicketListPage";
import TicketCreatePage from "./pages/Tickets/TicketCreatePage";
import TicketDetailPage from "./pages/TicketDetail/TicketDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tickets" replace />} />

      <Route path="/tickets" element={<TicketListPage />} />
      <Route path="/tickets/new" element={<TicketCreatePage />} />
      <Route path="/tickets/:id" element={<TicketDetailPage />} />

      <Route path="*" element={<Navigate to="/tickets" replace />} />
    </Routes>
  );
}