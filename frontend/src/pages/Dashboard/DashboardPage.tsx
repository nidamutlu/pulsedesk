import { Link } from "react-router-dom";

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
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
      {hint && <div className="mt-1 text-sm text-slate-600">{hint}</div>}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Overview of the current workspace.
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

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Open tickets" value="—" hint="Hook up later" />
          <StatCard label="In progress" value="—" hint="Hook up later" />
          <StatCard label="Resolved (7d)" value="—" hint="Hook up later" />
          <StatCard label="Avg. time to resolve" value="—" hint="Hook up later" />
        </div>

        {/* Main */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">
                Recent activity
              </div>
              <p className="mt-2 text-sm text-slate-600">
                This section will show recent ticket updates and important events.
              </p>

              <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                Placeholder content (will be replaced in the next phase).
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Quick actions</div>

              <div className="mt-4 grid gap-2">
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
              </div>

              <div className="mt-5 text-xs text-slate-500">
                Tip: Keep tickets updated to reflect progress.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}