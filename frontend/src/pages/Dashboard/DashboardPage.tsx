import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { fetchDashboardSummary } from "../../api/dashboard";
import type { DashboardSummary } from "../../api/dashboard";
import { ApiRequestError } from "../../api/http";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
      {hint ? <div className="mt-1 text-sm text-slate-600">{hint}</div> : null}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function PriorityBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "slate" | "amber" | "rose";
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 8 : 0) : 0;

  const barClass =
    tone === "amber"
      ? "bg-amber-500"
      : tone === "rose"
      ? "bg-rose-500"
      : "bg-slate-700";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{value}</span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function ActivityChart({
  items,
}: {
  items: Array<{ date: string; count: number }>;
}) {
  const max = Math.max(...items.map((item) => item.count), 0);

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex h-64 items-end justify-between gap-3">
        {items.map((item) => {
          const height = max > 0 ? Math.max((item.count / max) * 100, 8) : 8;

          return (
            <div
              key={item.date}
              className="flex flex-1 flex-col items-center justify-end gap-2"
            >
              <span className="text-xs font-semibold text-slate-700">
                {item.count}
              </span>

              <div className="flex h-48 w-full items-end">
                <div
                  className="w-full rounded-t-xl bg-slate-900 transition-all"
                  style={{ height: `${height}%` }}
                  title={`${item.count} tickets on ${formatShortDate(item.date)}`}
                />
              </div>

              <span className="text-xs text-slate-500">
                {formatShortDate(item.date)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatAverageHours(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return `${value.toFixed(1)} h`;
}

function formatShortDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
  });
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchDashboardSummary();

        if (!cancelled) {
          setSummary(data);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        if (err instanceof ApiRequestError) {
          setError(err.message || "Failed to load dashboard.");
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load dashboard.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Loading dashboard metrics...
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-red-700">
              Dashboard could not be loaded
            </h1>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-500">
              No dashboard data is available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const counts = summary.statusCounts;
  const priorities = summary.priorityCounts ?? {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
  };

  const priorityItems = [
    { label: "Low", value: priorities.LOW ?? 0, tone: "slate" as const },
    { label: "Medium", value: priorities.MEDIUM ?? 0, tone: "amber" as const },
    { label: "High", value: priorities.HIGH ?? 0, tone: "rose" as const },
  ];

  const maxPriorityCount = Math.max(
    ...priorityItems.map((item) => item.value),
    0
  );

  const totalActiveWork =
    counts.OPEN + counts.IN_PROGRESS + counts.WAITING_CUSTOMER;

  const totalCompleted = counts.RESOLVED + counts.CLOSED;

  const highestQueue =
    [
      { label: "Open", value: counts.OPEN },
      { label: "In Progress", value: counts.IN_PROGRESS },
      { label: "Waiting Customer", value: counts.WAITING_CUSTOMER },
      { label: "Resolved", value: counts.RESOLVED },
      { label: "Closed", value: counts.CLOSED },
    ].sort((a, b) => b.value - a.value)[0]?.label ?? "—";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Overview of ticket workload, resolution progress, and recent
              updates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/tickets"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Go to Tickets
            </Link>
            <Link
              to="/notifications"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Notifications
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Open"
            value={String(counts.OPEN)}
            hint="Awaiting triage"
          />
          <StatCard
            label="In Progress"
            value={String(counts.IN_PROGRESS)}
            hint="Actively handled"
          />
          <StatCard
            label="Waiting Customer"
            value={String(counts.WAITING_CUSTOMER)}
            hint="Pending reply"
          />
          <StatCard
            label="Avg. Resolution Time"
            value={formatAverageHours(summary.averageResolutionHours)}
            hint="Based on resolved tickets"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionCard title="Ticket Status Overview">
              <div className="grid gap-3">
                <StatusRow label="Open" value={String(counts.OPEN)} />
                <StatusRow
                  label="In Progress"
                  value={String(counts.IN_PROGRESS)}
                />
                <StatusRow
                  label="Waiting Customer"
                  value={String(counts.WAITING_CUSTOMER)}
                />
                <StatusRow label="Resolved" value={String(counts.RESOLVED)} />
                <StatusRow label="Closed" value={String(counts.CLOSED)} />
              </div>
            </SectionCard>
          </div>

          <div className="lg:col-span-1">
            <SectionCard title="Quick Summary">
              <div className="grid gap-3">
                <StatusRow
                  label="Total Active Work"
                  value={String(totalActiveWork)}
                />
                <StatusRow
                  label="Total Completed"
                  value={String(totalCompleted)}
                />
                <StatusRow label="Highest Queue" value={highestQueue} />
              </div>
            </SectionCard>

            <div className="mt-6">
              <SectionCard title="Quick Actions">
                <div className="grid gap-2">
                  <Link
                    to="/tickets/new"
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                  >
                    + Create ticket
                  </Link>

                  <Link
                    to="/tickets"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Browse tickets
                  </Link>

                  <Link
                    to="/notifications"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Review notifications
                  </Link>
                </div>

                <div className="mt-5 text-xs text-slate-500">
                  Keep ticket status and comments updated so the dashboard
                  reflects the current operational state.
                </div>
              </SectionCard>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <SectionCard title="Tickets Created in the Last 7 Days">
            {summary.last7DaysCreated.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No activity data found.
              </div>
            ) : (
              <ActivityChart items={summary.last7DaysCreated} />
            )}
          </SectionCard>
        </div>

        <div className="mt-6">
          <SectionCard title="Priority Distribution">
            <div className="space-y-4">
              {priorityItems.map((item) => (
                <PriorityBar
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  max={maxPriorityCount}
                  tone={item.tone}
                />
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}