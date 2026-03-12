import { NavLink, Outlet } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { fetchUnreadCount } from "../api/notifications";

function navClassName(isActive: boolean) {
  return [
    "inline-flex items-center gap-2 border-b-2 pb-1 text-sm font-medium transition-colors",
    isActive
      ? "border-slate-900 text-slate-900"
      : "border-transparent text-slate-600 hover:text-slate-900",
  ].join(" ");
}

function formatUnreadCount(count: number) {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  return String(count);
}

export default function Layout() {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    async function safeLoad() {
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
      void safeLoad();
    }

    void safeLoad();

    const intervalId = window.setInterval(() => {
      void safeLoad();
    }, 15000);

    window.addEventListener("notifications-updated", handleNotificationsUpdated);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
      window.removeEventListener(
        "notifications-updated",
        handleNotificationsUpdated
      );
    };
  }, [loadUnreadCount]);

  const unreadBadge = formatUnreadCount(unreadCount);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-10 px-4">
          <div className="shrink-0 text-lg font-bold tracking-tight text-slate-900">
            PulseDesk
          </div>

          <nav
            className="flex items-center gap-4 sm:gap-5"
            aria-label="Primary navigation"
          >
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
              className={({ isActive }) => `${navClassName(isActive)} relative`}
            >
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold leading-none text-white">
                  {unreadBadge}
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