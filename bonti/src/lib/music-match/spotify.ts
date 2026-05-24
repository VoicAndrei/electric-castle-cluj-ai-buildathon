export type NormalizedTrack = { title: string; artist: string };
export type NormalizedArtist = { name: string; frequency: number };
export type NormalizedPlaylist = {
  tracks: NormalizedTrack[];
  artists: NormalizedArtist[];
};

/**
 * Spotify's Nov 2024 Web API policy made `/v1/playlists/{id}` and
 * `/v1/playlists/{id}/tracks` return empty / 403 under client-credentials
 * auth for user-created playlists. The public embed page still ships the
 * full track list inside `__NEXT_DATA__`, so we fetch + scrape it instead.
 *
 * No auth needed. No env vars needed. Caps at the first 100 tracks
 * (Spotify embed limit), which is plenty for taste matching.
 */

type EmbedTrack = {
  title: string;
  subtitle: string;
  uri?: string;
};

const EMBED_URL = (id: string) =>
  `https://open.spotify.com/embed/playlist/${encodeURIComponent(id)}`;

const NEXT_DATA_RE = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

export async function fetchSpotifyPlaylist(playlistId: string): Promise<NormalizedPlaylist> {
  const res = await fetch(EMBED_URL(playlistId), {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Bonti/1.0; +https://bonti-ten.vercel.app)",
      Accept: "text/html",
    },
  });
  if (!res.ok) {
    throw new Error(`Spotify playlist not reachable (HTTP ${res.status})`);
  }
  const html = await res.text();
  const match = NEXT_DATA_RE.exec(html);
  if (!match) {
    throw new Error("Spotify embed page changed shape (no __NEXT_DATA__)");
  }
  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    throw new Error("Spotify embed __NEXT_DATA__ failed to parse");
  }
  const list = findTrackList(data);
  if (!list || list.length === 0) {
    throw new Error("Playlist looks empty or private");
  }

  const tracks: NormalizedTrack[] = [];
  const artistCounts = new Map<string, number>();
  for (const item of list) {
    if (!item.title || !item.subtitle) continue;
    const artists = item.subtitle
      .split(",")
      // Spotify uses NBSP (U+00A0) between names; normalize to plain space.
      .map((a) => a.replace(/ /g, " ").trim())
      .filter(Boolean);
    if (artists.length === 0) continue;
    const primary = artists[0];
    tracks.push({ title: item.title, artist: primary });
    for (const a of artists) {
      artistCounts.set(a, (artistCounts.get(a) ?? 0) + 1);
    }
  }
  if (tracks.length === 0) {
    throw new Error("Playlist contained no playable tracks");
  }

  const artists: NormalizedArtist[] = [...artistCounts.entries()]
    .map(([name, frequency]) => ({ name, frequency }))
    .sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name));

  return { tracks, artists };
}

function findTrackList(data: unknown, depth = 0): EmbedTrack[] | null {
  if (depth > 12) return null;
  if (Array.isArray(data)) {
    for (const v of data) {
      const r = findTrackList(v, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.trackList)) {
      return obj.trackList as EmbedTrack[];
    }
    for (const v of Object.values(obj)) {
      const r = findTrackList(v, depth + 1);
      if (r) return r;
    }
  }
  return null;
}

/** Kept as a no-op export so the existing test import doesn't fail. */
export function _resetTokenCacheForTests(): void {
  /* token cache is gone — embed scrape needs no auth */
}
