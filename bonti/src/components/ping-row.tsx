import Link from "next/link";
import { BontiAvatar } from "@/components/bonti-avatar";
import type { StoredPing } from "@/lib/festival/store";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function PingRow({ ping }: { ping: StoredPing }) {
  const row = (
    <div className={[
      "flex items-start gap-3 px-4 py-3 border-b border-black/5",
      ping.read ? "opacity-70" : "bg-bonti-surface",
    ].join(" ")}>
      <BontiAvatar size="sm" animated={false} />
      <div className="flex-1 min-w-0">
        <p className="text-bonti-text font-sofia uppercase text-xs tracking-wide truncate">
          {ping.title}
        </p>
        <p className="text-bonti-text font-roboto text-sm truncate">{ping.body}</p>
      </div>
      <span className="text-bonti-text/50 text-xs font-roboto">
        {formatTime(ping.received_at)}
      </span>
    </div>
  );
  return ping.deeplink ? <Link href={ping.deeplink}>{row}</Link> : row;
}
