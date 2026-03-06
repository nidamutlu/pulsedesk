import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchUnreadCount } from "../api/notifications";

function navClassName(isActive: boolean) {
  return [
    "inline-flex items-center gap-2 border-b-2 pb-1 text-sm font-medium transition",
    isActive
      ? "border-slate-900 text-slate-900"
      : "border-transparent text-slate-700 hover:text-slate-900",
  ].join(" ");
}

export default function Layout() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const count = await fetchUnreadCount();
        if (alive) {
          setUnreadCount(count);
        }
      } catch {
        if (alive) {
          setUnreadCount(0);
        }
      }
    }

    function handleNotificationsUpdated() {
      void load();
    }

    void load();

    const id = window.setInterval(() => {
      void load();
    }, 15000);

    window.addEventListener("notifications-updated", handleNotificationsUpdated);

    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener(
        "notifications-updated",
        handleNotificationsUpdated
      );
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <div className="font-bold text-slate-900">PulseDesk</div>

          <nav className="flex items-center gap-4">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => navClassName(isActive)}
            >
              Dashboard
            </NavLink>

            <NavLink
              to="/tickets"
              className={({ isActive }) => navClassName(isActive)}
            >
              Tickets
            </NavLink>

            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                `${navClassName(isActive)} relative`
              }
            >
              Notifications
              {unreadCount > 0 && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}