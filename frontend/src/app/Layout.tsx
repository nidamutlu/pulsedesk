import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchUnreadCount } from "../api/notifications";
import { getCurrentUser, logout } from "../api/auth";

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

function ProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Zm3 10.5a6.75 6.75 0 0 0-13.5 0"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 12H9.75m0 0 2.625-2.625M9.75 12l2.625 2.625"
      />
    </svg>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const currentUser = getCurrentUser();
  const unreadBadge = formatUnreadCount(unreadCount);
  const avatarLabel =
    currentUser?.username?.trim().charAt(0).toUpperCase() || "U";

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    void loadUnreadCount();

    function handleNotificationsUpdated() {
      void loadUnreadCount();
    }

    const intervalId = window.setInterval(() => {
      void loadUnreadCount();
    }, 15000);

    window.addEventListener("notifications-updated", handleNotificationsUpdated);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(
        "notifications-updated",
        handleNotificationsUpdated
      );
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-10">
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
                className={({ isActive }) =>
                  `${navClassName(isActive)} relative`
                }
              >
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span
                    className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold leading-none text-white"
                    aria-label={`${unreadCount} unread notifications`}
                  >
                    {unreadBadge}
                  </span>
                )}
              </NavLink>
            </nav>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white shadow-sm ring-2 ring-slate-200 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Open user menu"
            >
              {avatarLabel}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-lg"
                role="menu"
                aria-label="User menu"
              >
                <div className="px-3 pb-2">
                  <div className="flex items-start gap-3 rounded-xl px-3 py-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <ProfileIcon />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        Profile
                      </p>
                      <p className="mt-1 truncate text-sm font-medium text-slate-700">
                        {currentUser?.username ?? "User"}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {currentUser?.role ?? "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mx-3 border-t border-slate-200" />

                <div className="px-3 pt-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <LogoutIcon />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}