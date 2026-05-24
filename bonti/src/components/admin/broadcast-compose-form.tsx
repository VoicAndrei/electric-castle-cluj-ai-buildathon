"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Venue = { id: string; name: string };
type Urgency = "standard" | "critical";

export function BroadcastComposeForm({ venues }: { venues: Venue[] }) {
  const router = useRouter();
  const [sourceText, setSourceText] = useState("");
  const [targetVenue, setTargetVenue] = useState<string>("");
  const [urgency, setUrgency] = useState<Urgency>("standard");

  const [titleEn, setTitleEn] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [titleRo, setTitleRo] = useState("");
  const [bodyRo, setBodyRo] = useState("");

  const [drafting, setDrafting] = useState(false);
  const [draftErr, setDraftErr] = useState<string | null>(null);
  const [sending, startSend] = useTransition();
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  async function draft() {
    setDraftErr(null);
    setDrafting(true);
    try {
      const res = await fetch("/api/admin/broadcast/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source_text: sourceText,
          target_venue_id: targetVenue || null,
          urgency,
        }),
      });
      if (!res.ok) throw new Error(`Draft failed (${res.status})`);
      const d = await res.json();
      setTitleEn(d.title_en); setBodyEn(d.body_en);
      setTitleRo(d.title_ro); setBodyRo(d.body_ro);
    } catch (e) {
      setDraftErr((e as Error).message);
    } finally {
      setDrafting(false);
    }
  }

  function send() {
    setSendMsg(null);
    startSend(async () => {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source_text: sourceText,
          title_en: titleEn, body_en: bodyEn,
          title_ro: titleRo, body_ro: bodyRo,
          urgency,
          target_venue_id: targetVenue || null,
        }),
      });
      if (!res.ok) {
        setSendMsg(`Send failed (${res.status})`);
        return;
      }
      setSendMsg("Broadcast sent.");
      setSourceText(""); setTitleEn(""); setBodyEn(""); setTitleRo(""); setBodyRo("");
      setTargetVenue(""); setUrgency("standard");
      router.refresh();
    });
  }

  const canDraft = sourceText.trim().length > 0 && !drafting;
  const canSend = bodyEn.trim().length > 0 && bodyRo.trim().length > 0 && !sending;

  return (
    <div className="space-y-4 bg-white rounded-lg p-4 shadow-sm">
      <label className="block">
        <span className="font-roboto text-sm text-bonti-text/70">What happened?</span>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          rows={2}
          maxLength={280}
          placeholder="e.g. Justin Timberlake starts in 5 min, head to Main"
          className="mt-1 w-full border border-black/10 rounded-md px-3 py-2 font-roboto text-sm"
        />
      </label>

      <div className="flex gap-3 items-end">
        <label className="flex-1">
          <span className="font-roboto text-xs text-bonti-text/70">Target venue</span>
          <select
            value={targetVenue}
            onChange={(e) => setTargetVenue(e.target.value)}
            className="mt-1 w-full border border-black/10 rounded-md px-2 py-2 font-roboto text-sm bg-white"
          >
            <option value="">(none — festival-wide)</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </label>
        <fieldset className="flex gap-3 items-center">
          <legend className="sr-only">Urgency</legend>
          <label className="font-roboto text-sm flex items-center gap-1">
            <input type="radio" checked={urgency === "standard"} onChange={() => setUrgency("standard")} />
            standard
          </label>
          <label className="font-roboto text-sm flex items-center gap-1 text-bonti-red">
            <input type="radio" checked={urgency === "critical"} onChange={() => setUrgency("critical")} />
            critical
          </label>
        </fieldset>
      </div>

      <button
        type="button"
        disabled={!canDraft}
        onClick={draft}
        className="bg-bonti-toolbar text-white font-sofia uppercase text-xs px-3 py-2 rounded disabled:opacity-50"
      >
        {drafting ? "Drafting…" : "✨ Draft with AI"}
      </button>
      {draftErr && (
        <p className="text-bonti-red text-xs font-roboto">Draft failed: {draftErr}. You can still send manually.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="border border-black/10 rounded-md p-3 space-y-2">
          <legend className="font-sofia uppercase text-xs text-bonti-text/70 px-1">EN</legend>
          <input
            value={titleEn} onChange={(e) => setTitleEn(e.target.value)}
            placeholder="Title (optional)" maxLength={60}
            className="w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm"
          />
          <textarea
            value={bodyEn} onChange={(e) => setBodyEn(e.target.value)}
            rows={2} maxLength={280} placeholder="Body"
            className="w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm"
          />
        </fieldset>
        <fieldset className="border border-black/10 rounded-md p-3 space-y-2">
          <legend className="font-sofia uppercase text-xs text-bonti-text/70 px-1">RO</legend>
          <input
            value={titleRo} onChange={(e) => setTitleRo(e.target.value)}
            placeholder="Titlu (opțional)" maxLength={60}
            className="w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm"
          />
          <textarea
            value={bodyRo} onChange={(e) => setBodyRo(e.target.value)}
            rows={2} maxLength={280} placeholder="Corp"
            className="w-full border border-black/10 rounded px-2 py-1 font-roboto text-sm"
          />
        </fieldset>
      </div>

      <button
        type="button"
        disabled={!canSend}
        onClick={send}
        className={[
          "w-full font-sofia uppercase text-sm px-4 py-3 rounded text-white",
          urgency === "critical" ? "bg-bonti-red" : "bg-bonti-toolbar",
          "disabled:opacity-50",
        ].join(" ")}
      >
        {sending ? "Sending…" : "Send broadcast →"}
      </button>
      {sendMsg && <p className="font-roboto text-xs text-bonti-text">{sendMsg}</p>}
    </div>
  );
}
