import type { MatchOutput } from "@/lib/music-match/match-schema";

type Props = { result: MatchOutput };

export function MatchCard({ result }: Props) {
  return (
    <article className="rounded-lg border bg-white p-4 sm:p-6 space-y-5">
      <p className="text-lg leading-snug text-bonti-ink">{result.intro}</p>

      {result.picks.length > 0 && (
        <ul className="space-y-3">
          {result.picks.map((p, i) => (
            <li key={`pick-${i}`} className="flex items-start gap-3">
              <span aria-hidden className="mt-1">🟢</span>
              <div className="flex-1">
                <p className="font-medium text-bonti-ink">
                  {p.artist} — {p.day}, {p.stage}
                </p>
                <p className="text-sm text-bonti-ink/80">{p.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {result.skips.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-bonti-ink/60 mb-2">Skip</p>
          <ul className="space-y-2">
            {result.skips.map((s, i) => (
              <li key={`skip-${i}`} className="flex items-start gap-3">
                <span aria-hidden className="mt-1">🔴</span>
                <div className="flex-1">
                  <p className="font-medium text-bonti-ink">{s.artist}</p>
                  <p className="text-sm text-bonti-ink/80">{s.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
