import { redirect } from "next/navigation";
import { requireAdmin, AdminAuthError } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type EventRow = {
  type: string;
  payload: Record<string, unknown> | null;
  session_id: string | null;
  created_at: string;
};

const COUNTER_TYPES = [
  { type: "chat_message", label: "Chat messages" },
  { type: "match_completed", label: "Music matches" },
  { type: "compass_query", label: "Compass queries" },
  { type: "lineup_view", label: "Lineup views" },
  { type: "broadcast_sent", label: "Broadcasts sent" },
  { type: "group_converge", label: "Group meets" },
] as const;

function readString(payload: EventRow["payload"], key: string): string | null {
  const v = payload?.[key];
  return typeof v === "string" ? v : null;
}

function readNumber(payload: EventRow["payload"], key: string): number | null {
  const v = payload?.[key];
  return typeof v === "number" ? v : null;
}

function bucketByHour(events: EventRow[]): number[] {
  const now = Date.now();
  const buckets = new Array<number>(24).fill(0);
  for (const e of events) {
    const ms = new Date(e.created_at).getTime();
    const hourBack = Math.floor((now - ms) / 3600_000);
    if (hourBack >= 0 && hourBack < 24) buckets[23 - hourBack] += 1;
  }
  return buckets;
}

export default async function AdminInsightsPage() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      if (e.status === 401) redirect("/admin/sign-in");
      return (
        <div className="text-center py-12">
          <h1 className="font-sofia uppercase text-bonti-red text-2xl mb-2">403</h1>
          <p className="font-roboto text-bonti-text">Your account is not authorized for Bonți Ops.</p>
        </div>
      );
    }
    throw e;
  }

  const supabase = createAdminClient();
  // Server component runs once per request — Date.now() non-determinism is intentional.
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("events")
    .select("type, payload, session_id, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <p className="font-roboto text-sm text-bonti-red">
          Events table unavailable: {error.message}
        </p>
      </div>
    );
  }

  const events = (data ?? []) as EventRow[];

  // Counters
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.type] = (counts[e.type] ?? 0) + 1;

  // Unique sessions
  const sessions = new Set<string>();
  for (const e of events) if (e.session_id) sessions.add(e.session_id);

  // Hourly bars
  const hourly = bucketByHour(events);
  const hourlyMax = Math.max(1, ...hourly);

  // Top artists from match_completed
  const artistCounts: Record<string, number> = {};
  for (const e of events) {
    if (e.type !== "match_completed") continue;
    const a = readString(e.payload, "top_artist");
    if (a) artistCounts[a] = (artistCounts[a] ?? 0) + 1;
  }
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Locale split (chat + lineup + artist_blurb)
  const locale: Record<"en" | "ro", number> = { en: 0, ro: 0 };
  for (const e of events) {
    const lang =
      readString(e.payload, "locale") ?? readString(e.payload, "language");
    if (lang === "en" || lang === "ro") locale[lang] += 1;
  }
  const localeTotal = locale.en + locale.ro;

  // Broadcast latency: average delta per broadcast_id between sent and received
  const broadcastSent = new Map<string, { sentAt: number; urgency: string; targeted: boolean }>();
  for (const e of events) {
    if (e.type !== "broadcast_sent") continue;
    const id = readString(e.payload, "broadcast_id");
    if (!id) continue;
    broadcastSent.set(id, {
      sentAt: new Date(e.created_at).getTime(),
      urgency: readString(e.payload, "urgency") ?? "standard",
      targeted: e.payload?.has_target_venue === true,
    });
  }
  const recvByBroadcast = new Map<string, { count: number; latencySum: number }>();
  for (const e of events) {
    if (e.type !== "broadcast_received") continue;
    const id = readString(e.payload, "broadcast_id");
    const lat = readNumber(e.payload, "latency_ms");
    if (!id || lat === null) continue;
    const cur = recvByBroadcast.get(id) ?? { count: 0, latencySum: 0 };
    cur.count += 1;
    cur.latencySum += lat;
    recvByBroadcast.set(id, cur);
  }
  const broadcastRows = Array.from(broadcastSent.entries())
    .map(([id, b]) => {
      const recv = recvByBroadcast.get(id);
      return {
        id,
        sentAt: b.sentAt,
        urgency: b.urgency,
        targeted: b.targeted,
        recipients: recv?.count ?? 0,
        avgLatencyMs: recv ? Math.round(recv.latencySum / recv.count) : null,
      };
    })
    .sort((a, b) => b.sentAt - a.sentAt);

  // Recent events feed (last 20)
  const recent = events.slice(0, 20);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-sofia uppercase tracking-wide text-bonti-text">Insights</h2>
        <p className="font-roboto text-bonti-text/60 text-xs mt-1">
          Last 24 hours · {events.length} events · {sessions.size} unique sessions
        </p>
      </header>

      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COUNTER_TYPES.map(({ type, label }) => (
            <div key={type} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="font-roboto text-xs uppercase tracking-wide text-bonti-text/60">
                {label}
              </div>
              <div className="font-sofia text-3xl text-bonti-text mt-1">
                {counts[type] ?? 0}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-sofia uppercase tracking-wide text-bonti-text text-sm mb-3">
          Activity by hour
        </h3>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-end gap-1 h-32">
            {hourly.map((count, i) => (
              <div
                key={i}
                className="flex-1 bg-bonti-red rounded-t"
                style={{ height: `${Math.max(2, (count / hourlyMax) * 100)}%` }}
                title={`${count} events · ${24 - i}h ago`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] font-roboto text-bonti-text/50 mt-2">
            <span>24h ago</span>
            <span>12h ago</span>
            <span>now</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="font-sofia uppercase tracking-wide text-bonti-text text-sm mb-3">
            Top matched artists
          </h3>
          {topArtists.length === 0 ? (
            <p className="font-roboto text-bonti-text/50 text-sm">No matches yet.</p>
          ) : (
            <ul className="space-y-2">
              {topArtists.map(([artist, count]) => (
                <li key={artist} className="flex items-center gap-3">
                  <span className="flex-1 font-roboto text-bonti-text text-sm truncate">{artist}</span>
                  <div className="flex-1 bg-bonti-bg rounded h-2 overflow-hidden">
                    <div
                      className="bg-bonti-red h-full"
                      style={{
                        width: `${(count / topArtists[0][1]) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="font-roboto text-bonti-text/60 text-xs w-6 text-right">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="font-sofia uppercase tracking-wide text-bonti-text text-sm mb-3">
            Locale split
          </h3>
          {localeTotal === 0 ? (
            <p className="font-roboto text-bonti-text/50 text-sm">No language signal yet.</p>
          ) : (
            <div className="space-y-3">
              {(["en", "ro"] as const).map((lang) => {
                const pct = localeTotal > 0 ? Math.round((locale[lang] / localeTotal) * 100) : 0;
                return (
                  <div key={lang}>
                    <div className="flex justify-between font-roboto text-sm text-bonti-text mb-1">
                      <span className="uppercase">{lang}</span>
                      <span className="text-bonti-text/60">{locale[lang]} · {pct}%</span>
                    </div>
                    <div className="bg-bonti-bg rounded h-2 overflow-hidden">
                      <div className="bg-bonti-red h-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="font-sofia uppercase tracking-wide text-bonti-text text-sm mb-3">
          Recent broadcasts
        </h3>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {broadcastRows.length === 0 ? (
            <p className="font-roboto text-bonti-text/50 text-sm p-4">No broadcasts in last 24h.</p>
          ) : (
            <table className="w-full text-sm font-roboto">
              <thead>
                <tr className="text-bonti-text/60 text-xs uppercase border-b border-bonti-bg">
                  <th className="text-left p-3">Sent</th>
                  <th className="text-left p-3">Urgency</th>
                  <th className="text-right p-3">Recipients</th>
                  <th className="text-right p-3">Avg latency</th>
                </tr>
              </thead>
              <tbody>
                {broadcastRows.map((b) => (
                  <tr key={b.id} className="border-t border-bonti-bg">
                    <td className="p-3 text-bonti-text">
                      {new Date(b.sentAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      {b.targeted ? <span className="text-bonti-text/40 ml-2">· targeted</span> : null}
                    </td>
                    <td className="p-3">
                      <span className={b.urgency === "critical" ? "text-bonti-red uppercase text-xs font-sofia" : "text-bonti-text/70 uppercase text-xs font-sofia"}>
                        {b.urgency}
                      </span>
                    </td>
                    <td className="p-3 text-right text-bonti-text">{b.recipients}</td>
                    <td className="p-3 text-right text-bonti-text/70">
                      {b.avgLatencyMs === null ? "—" : `${b.avgLatencyMs}ms`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <h3 className="font-sofia uppercase tracking-wide text-bonti-text text-sm mb-3">
          Recent events
        </h3>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <ul className="divide-y divide-bonti-bg">
            {recent.map((e, i) => (
              <li key={`${e.created_at}-${i}`} className="px-3 py-2 flex items-center gap-3 text-sm font-roboto">
                <span className="text-bonti-text/40 text-xs w-16 tabular-nums">
                  {new Date(e.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-bonti-text">{e.type}</span>
                <span className="text-bonti-text/40 text-xs ml-auto truncate max-w-[40%]">
                  {e.session_id ? `s:${e.session_id.slice(0, 6)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
