"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LineupEditSheet } from "@/components/admin/lineup-edit-sheet";
import { formatLocalRange } from "@/lib/festival/time";

export type EditorRow = {
  id: string;
  artist_name: string;
  day: "Friday" | "Saturday" | "Sunday";
  stage: string;
  start_at: string | null;
  end_at: string | null;
  ec_tags: string[];
  genres: string[];
  photo_url: string | null;
  sort_order: number;
};

const DAYS = ["All", "Friday", "Saturday", "Sunday"] as const;
type DayTab = (typeof DAYS)[number];

export function LineupEditor({ initial }: { initial: EditorRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<DayTab>("All");
  const [editing, setEditing] = useState<EditorRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = useMemo(
    () => initial.filter(r => tab === "All" || r.day === tab),
    [initial, tab],
  );

  const stages = useMemo(
    () => Array.from(new Set(initial.map(r => r.stage))).sort(),
    [initial],
  );

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function save(row: EditorRow & { _id?: string | null }) {
    const isNew = !row.id || row.id.startsWith("new-");
    const url = isNew ? "/api/admin/lineup" : `/api/admin/lineup/${row.id}`;
    const method = isNew ? "POST" : "PATCH";
    const { id: _omitId, ...body } = row;
    void _omitId;
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setMsg(`Save failed (${res.status})`);
      return;
    }
    setMsg("Saved.");
    setEditing(null);
    setCreating(false);
    refresh();
  }

  async function remove(row: EditorRow) {
    const res = await fetch(`/api/admin/lineup/${row.id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      setMsg(`Delete failed (${res.status})`);
      return;
    }
    setMsg("Deleted.");
    setEditing(null);
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm">
          {DAYS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setTab(d)}
              className={[
                "px-3 py-1.5 text-xs font-sofia uppercase tracking-wide rounded",
                tab === d ? "bg-bonti-toolbar text-white" : "text-bonti-text/70",
              ].join(" ")}
            >
              {d}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="bg-bonti-toolbar text-white font-sofia uppercase text-xs px-3 py-1.5 rounded"
        >
          + Add
        </button>
      </div>

      <ul className="bg-white rounded-lg shadow-sm divide-y divide-black/5">
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center font-roboto text-sm text-bonti-text/60">No entries.</li>
        )}
        {filtered.map(r => (
          <li key={r.id} className="px-4 py-3 flex items-baseline gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-sofia uppercase text-sm tracking-wide truncate">{r.artist_name}</p>
              <p className="font-roboto text-xs text-bonti-text/60 truncate">
                {r.stage} · {r.day} · {formatLocalRange(r.start_at, r.end_at)}
              </p>
              {r.ec_tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.ec_tags.map(t => (
                    <span key={t} className="text-[10px] uppercase tracking-wide bg-bonti-bg text-bonti-text/70 rounded-full px-2 py-0.5">{t}</span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditing(r)}
              aria-label={`Edit ${r.artist_name}`}
              className="text-bonti-text/40 hover:text-bonti-text px-2"
            >✎</button>
          </li>
        ))}
      </ul>

      {msg && <p className="font-roboto text-xs text-bonti-text">{msg}</p>}
      {pending && <p className="font-roboto text-xs text-bonti-text/50">Refreshing…</p>}

      {editing && (
        <LineupEditSheet
          row={editing}
          stages={stages}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
      {creating && (
        <LineupEditSheet
          row={emptyRow()}
          stages={stages}
          onClose={() => setCreating(false)}
          onSave={save}
        />
      )}
    </div>
  );
}

function emptyRow(): EditorRow {
  return {
    id: `new-${crypto.randomUUID()}`,
    artist_name: "",
    day: "Friday",
    stage: "Main Stage",
    start_at: null,
    end_at: null,
    ec_tags: [],
    genres: [],
    photo_url: null,
    sort_order: 0,
  };
}
