"use client";

import { AppHeader } from "@/components/app-header";
import { PingRow } from "@/components/ping-row";
import { useFestivalStore } from "@/lib/festival/store";

export default function NotificationsPage() {
  const pings = useFestivalStore(s => s.pings);
  const markAllRead = useFestivalStore(s => s.markAllPingsRead);
  const unread = pings.filter(p => !p.read).length;

  return (
    <>
      <AppHeader title="Pings" showBack unread={unread} />
      <div className="px-4 pt-3 flex items-center justify-between">
        <p className="text-bonti-text/70 font-roboto text-sm">{pings.length} today</p>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs font-roboto underline text-bonti-text"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="mt-3">
        {pings.map(p => <PingRow key={p.id} ping={p} />)}
      </div>
    </>
  );
}
