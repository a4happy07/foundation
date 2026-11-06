"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { FormEvent } from "react";
import type { Entry } from "../lib/entries";

type Viewer = {
  name: string;
  email: string;
  simulated: boolean;
  stage: "production" | "preview";
};

type Props = {
  viewer: Viewer;
  initialEntries: Entry[];
};

export function ShipLog({ viewer, initialEntries }: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [optimistic, addOptimistic] = useOptimistic(
    entries,
    (
      current: Entry[],
      action:
        | { type: "add"; entry: Entry }
        | { type: "toggle"; id: number; done: boolean }
        | { type: "remove"; id: number },
    ) => {
      if (action.type === "add") return [action.entry, ...current];
      if (action.type === "toggle") {
        return current.map((e) =>
          e.id === action.id ? { ...e, done: action.done } : e,
        );
      }
      return current.filter((e) => e.id !== action.id);
    },
  );

  const openCount = optimistic.filter((e) => !e.done).length;
  const greeting = viewer.name?.trim() || "there";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || pending) return;

    const temp: Entry = {
      id: -Date.now(),
      body,
      done: false,
      created_at: new Date().toISOString(),
    };

    setError(null);
    setDraft("");
    startTransition(async () => {
      addOptimistic({ type: "add", entry: temp });
      try {
        const res = await fetch("/api/entries", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body }),
        });
        if (!res.ok) throw new Error("save_failed");
        const data = (await res.json()) as { entry: Entry };
        setEntries((prev) => [data.entry, ...prev]);
      } catch {
        setDraft(body);
        setError("Could not save that note. Try again.");
      }
    });
  }

  function toggle(entry: Entry) {
    const next = !entry.done;
    startTransition(async () => {
      addOptimistic({ type: "toggle", id: entry.id, done: next });
      try {
        const res = await fetch(`/api/entries/${entry.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ done: next }),
        });
        if (!res.ok) throw new Error("toggle_failed");
        const data = (await res.json()) as { entry: Entry };
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? data.entry : e)),
        );
      } catch {
        setError("Could not update that note.");
      }
    });
  }

  function remove(entry: Entry) {
    startTransition(async () => {
      addOptimistic({ type: "remove", id: entry.id });
      try {
        const res = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
        if (!res.ok && res.status !== 204) throw new Error("delete_failed");
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      } catch {
        setError("Could not remove that note.");
      }
    });
  }

  return (
    <div className="page-shell">
      <div className="atmosphere" aria-hidden="true" />
      <header className="hero">
        <p className="brand">Ship Log</p>
        <h1 className="headline">What moved today?</h1>
        <p className="lede">
          Private notes for {greeting} — capture what shipped, what stalled, and
          what comes next.
        </p>
        {viewer.simulated ? (
          <p className="sim-note">Local preview uses a simulated viewer.</p>
        ) : null}
      </header>

      <section className="composer" aria-label="Add a ship note">
        <form onSubmit={onSubmit} className="composer-form">
          <label htmlFor="note" className="sr-only">
            Ship note
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            maxLength={500}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Shipped auth middleware · Blocked on staging DNS · Next: polish empty states"
            className="composer-input"
          />
          <div className="composer-row">
            <span className="meta">
              {openCount} open · {optimistic.length} total
            </span>
            <button type="submit" className="cta" disabled={pending || !draft.trim()}>
              Log it
            </button>
          </div>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="log" aria-label="Your ship notes">
        {optimistic.length === 0 ? (
          <p className="empty">
            Your log is clear. Write the first line above — one concrete thing
            that moved.
          </p>
        ) : (
          <ul className="log-list">
            {optimistic.map((entry, index) => (
              <li
                key={entry.id}
                className={`log-item${entry.done ? " is-done" : ""}`}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <button
                  type="button"
                  className="check"
                  aria-pressed={entry.done}
                  aria-label={entry.done ? "Mark as open" : "Mark as done"}
                  onClick={() => toggle(entry)}
                >
                  <span />
                </button>
                <div className="log-body">
                  <p>{entry.body}</p>
                  <time dateTime={entry.created_at}>
                    {formatWhen(entry.created_at)}
                  </time>
                </div>
                <button
                  type="button"
                  className="remove"
                  aria-label="Remove note"
                  onClick={() => remove(entry)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon",
  }).format(date);
}
