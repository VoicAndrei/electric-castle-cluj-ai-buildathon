"use client";

import { useState } from "react";
import type { EditorRow } from "@/components/admin/lineup-editor";
import { toLocalDateTimeInputValue, fromLocalDateTimeInputValue } from "@/lib/festival/time";

export function LineupEditSheet({
  row, stages, onClose, onSave, onDelete,
}: {
  row: EditorRow;
  stages: string[];
  onClose: () => void;
  onSave: (next: EditorRow) => Promise<void>;
  onDelete?: (row: EditorRow) => Promise<void>;
}) {
  const [artistName, setArtistName] = useState(row.artist_name);
  const [day, setDay] = useState<EditorRow["day"]>(row.day);
  const [stage, setStage] = useState(row.stage);
  const [startLocal, setStartLocal] = useState(toLocalDateTimeInputValue(row.start_at));
  const [endLocal, setEndLocal] = useState(toLocalDateTimeInputValue(row.end_at));
  const [tags, setTags] = useState(row.ec_tags.join(", "));
  const [genres, setGenres] = useState(row.genres.join(", "));
  const [photoUrl, setPhotoUrl] = useState(row.photo_url ?? "");
  const [sortOrder, setSortOrder] = useState(row.sort_order);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isNew = row.id.startsWith("new-");

  async function handleSave() {
    setErr(null);
    setPending(true);
    try {
      const start_at = fromLocalDateTimeInputValue(startLocal);
      const end_at = fromLocalDateTimeInputValue(endLocal);
      if (start_at && end_at && new Date(end_at) <= new Date(start_at)) {
        setErr("End must be after start.");
        return;
      }
      await onSave({
        ...row,
        artist_name: artistName.trim(),
        day,
        stage: stage.trim(),
        start_at,
        end_at,
        ec_tags: tags.split(",").map(s => s.trim()).filter(Boolean),
        genres: genres.split(",").map(s => s.trim()).filter(Boolean),
        photo_url: photoUrl.trim() || null,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (deleteConfirm.trim() !== artistName.trim()) {
      setErr("Type the artist name exactly to confirm.");
      return;
    }
    setPending(true);
    await onDelete(row);
    setPending(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full sm:max-w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-sofia uppercase tracking-wide text-bonti-text mb-3">
          {isNew ? "New artist" : artistName || "Edit artist"}
        </h3>

        <label className="block mb-2">
          <span className="font-roboto text-xs text-bonti-text/70">Artist name</span>
          <input value={artistName} onChange={(e) => setArtistName(e.target.value)} maxLength={80}
            className="mt-1 w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm" />
        </label>

        <div className="flex gap-2 mb-2">
          <fieldset>
            <legend className="font-roboto text-xs text-bonti-text/70">Day</legend>
            <div className="mt-1 flex gap-1">
              {(["Thursday", "Friday", "Saturday", "Sunday"] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDay(d)}
                  className={[
                    "px-3 py-1.5 text-xs font-sofia uppercase rounded",
                    d === day ? "bg-bonti-toolbar text-white" : "bg-bonti-bg text-bonti-text/70",
                  ].join(" ")}
                >{d.slice(0, 3)}</button>
              ))}
            </div>
          </fieldset>
        </div>

        <label className="block mb-2">
          <span className="font-roboto text-xs text-bonti-text/70">Stage</span>
          <input value={stage} onChange={(e) => setStage(e.target.value)} list="stage-suggestions" maxLength={60}
            className="mt-1 w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm" />
          <datalist id="stage-suggestions">
            {stages.map(s => <option key={s} value={s} />)}
          </datalist>
        </label>

        <div className="flex gap-2 mb-2">
          <label className="block flex-1">
            <span className="font-roboto text-xs text-bonti-text/70">Start (Europe/Bucharest)</span>
            <input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)}
              className="mt-1 w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm" />
          </label>
          <label className="block flex-1">
            <span className="font-roboto text-xs text-bonti-text/70">End (Europe/Bucharest)</span>
            <input type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)}
              className="mt-1 w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm" />
          </label>
        </div>
        <p className="font-roboto text-[10px] text-bonti-text/50 -mt-1 mb-2">Leave blank for TBA.</p>

        <label className="block mb-2">
          <span className="font-roboto text-xs text-bonti-text/70">EC tags (comma-separated)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)}
            className="mt-1 w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm" />
        </label>

        <label className="block mb-2">
          <span className="font-roboto text-xs text-bonti-text/70">Genres (comma-separated)</span>
          <input value={genres} onChange={(e) => setGenres(e.target.value)}
            className="mt-1 w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm" />
        </label>

        <label className="block mb-2">
          <span className="font-roboto text-xs text-bonti-text/70">Photo URL</span>
          <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} type="url"
            className="mt-1 w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm" />
        </label>

        <label className="block mb-3">
          <span className="font-roboto text-xs text-bonti-text/70">Sort order</span>
          <input type="number" value={sortOrder}
            onChange={(e) => setSortOrder(Number.parseInt(e.target.value, 10))} min={0}
            className="mt-1 w-32 border border-black/10 rounded px-2 py-1 font-roboto text-sm" />
        </label>

        {err && <p className="text-bonti-red text-xs font-roboto mb-2">{err}</p>}

        {!isNew && onDelete && (
          <div className="border-t border-black/10 pt-3 mb-3">
            <p className="font-roboto text-xs text-bonti-text/70">Type the artist name to delete:</p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="mt-1 w-full border border-bonti-red/30 rounded px-2 py-1 font-roboto text-sm"
            />
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending || deleteConfirm.trim() !== artistName.trim()}
              className="mt-2 bg-bonti-red text-white font-sofia uppercase text-xs px-3 py-1.5 rounded disabled:opacity-30"
            >Delete artist</button>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose}
            className="font-sofia uppercase text-xs px-3 py-2 text-bonti-text/70">Cancel</button>
          <button type="button" onClick={handleSave} disabled={pending || !artistName.trim() || !stage.trim()}
            className="bg-bonti-toolbar text-white font-sofia uppercase text-xs px-4 py-2 rounded disabled:opacity-30">
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
