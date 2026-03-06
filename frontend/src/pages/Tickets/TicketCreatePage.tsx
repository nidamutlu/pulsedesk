import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiRequestError } from "../../api/http";
import { createTicket } from "../../api/tickets";
import type { TicketCreateRequest, TicketPriority } from "../../api/tickets";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="mt-2 text-sm text-rose-600">{message}</div>;
}

function toFieldErrors(details: unknown): Record<string, string> {
  if (!details || typeof details !== "object") return {};
  const obj = details as Record<string, unknown>;

  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") out[k] = v;
    else if (v != null) out[k] = String(v);
  }
  return out;
}

export default function TicketCreatePage() {
  const nav = useNavigate();

  const titleRef = useRef<HTMLInputElement | null>(null);
  const descRef = useRef<HTMLTextAreaElement | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("LOW");

  const teamId = 1;

  const [saving, setSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  const isTitleValid = trimmedTitle.length > 0;
  const isDescriptionValid = trimmedDescription.length > 0;

  const canSubmit = isTitleValid && isDescriptionValid && !saving;

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function focusFirstInvalidField(nextErrors?: Record<string, string>) {
    const fe = nextErrors ?? fieldErrors;

    if (!isTitleValid || fe["title"]) {
      titleRef.current?.focus();
      return;
    }

    if (!isDescriptionValid || fe["description"]) {
      descRef.current?.focus();
      return;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setGeneralError(null);
    setFieldErrors({});

    if (!isTitleValid || !isDescriptionValid) {
      const nextErrors: Record<string, string> = {};
      if (!isTitleValid) nextErrors["title"] = "Title is required";
      if (!isDescriptionValid) nextErrors["description"] = "Description is required";

      setFieldErrors(nextErrors);
      requestAnimationFrame(() => focusFirstInvalidField(nextErrors));
      return;
    }

    setSaving(true);

    const body: TicketCreateRequest = {
      title: trimmedTitle,
      description: trimmedDescription,
      priority,
      teamId,
    };

    try {
      const created = await createTicket(body);
      nav(`/tickets/${created.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        const mapped = toFieldErrors(err.details);

        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
          setGeneralError("Please fix the highlighted fields.");
          requestAnimationFrame(() => focusFirstInvalidField(mapped));
        } else {
          setGeneralError(`${err.status} • ${err.message}`);
        }

        return;
      }

      setGeneralError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/tickets"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Tickets
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-500">Tickets</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                Create Ticket
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Provide a clear title and description so the team can help faster.
              </p>
            </div>

            <div className="text-sm text-slate-600">
              <div>
                Team: <span className="font-semibold text-slate-900">{teamId}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="text-sm font-semibold text-slate-900">Details</div>
            <div className="mt-1 text-sm text-slate-600">
              Fields marked as required should be filled before submitting.
            </div>
          </div>

          <div className="px-6 py-6">
            {generalError && (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {generalError}
              </div>
            )}

            <form onSubmit={onSubmit} className="grid gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-900">
                  Title <span className="text-rose-600">*</span>
                </label>
                <input
                  ref={titleRef}
                  value={title}
                  disabled={saving}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    clearFieldError("title");
                  }}
                  placeholder="e.g., VPN connection fails intermittently"
                  className={cx(
                    "mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none",
                    "focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60",
                    fieldErrors["title"]
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-slate-200"
                  )}
                />
                <FieldError message={fieldErrors["title"]} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900">
                  Description <span className="text-rose-600">*</span>
                </label>
                <textarea
                  ref={descRef}
                  value={description}
                  disabled={saving}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    clearFieldError("description");
                  }}
                  placeholder="Describe the issue, steps to reproduce, and expected behavior."
                  className={cx(
                    "mt-2 min-h-[180px] w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none",
                    "focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60",
                    fieldErrors["description"]
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-slate-200"
                  )}
                />
                <FieldError message={fieldErrors["description"]} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900">
                  Priority
                </label>
                <select
                  value={priority}
                  disabled={saving}
                  onChange={(e) => {
                    setPriority(e.target.value as TicketPriority);
                    clearFieldError("priority");
                  }}
                  className={cx(
                    "mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none",
                    "focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60",
                    fieldErrors["priority"]
                      ? "border-rose-300 focus:border-rose-400"
                      : "border-slate-200"
                  )}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
                <FieldError message={fieldErrors["priority"]} />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Create Ticket"}
                </button>

                <button
                  type="button"
                  onClick={() => nav("/tickets")}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <div className="text-xs text-slate-500">* Required fields</div>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Requester is derived from the authenticated user context.
        </div>
      </div>
    </div>
  );
}