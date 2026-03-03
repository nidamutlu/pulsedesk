import { Link, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchUnreadCount } from "../api/notifications";

export default function Layout() {
  const userId = 2;
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const c = await fetchUnreadCount(userId);
        if (alive) setUnreadCount(c);
      } catch {}
    }

    void load();
    const id = window.setInterval(load, 15000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <div className="font-bold text-slate-900">PulseDesk</div>

          <nav className="flex items-center gap-4 text-sm font-medium text-slate-700">
            <Link to="/dashboard" className="hover:text-slate-900">
              Dashboard
            </Link>

            <Link to="/tickets" className="hover:text-slate-900">
              Tickets
            </Link>

            <Link
              to="/notifications"
              className="relative inline-flex items-center gap-2 hover:text-slate-900"
            >
              Notifications
              {unreadCount > 0 && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}