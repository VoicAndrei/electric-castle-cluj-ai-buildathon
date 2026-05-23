export type NormalizedTrack = { title: string; artist: string };
export type NormalizedArtist = { name: string; frequency: number };
export type NormalizedPlaylist = {
  tracks: NormalizedTrack[];
  artists: NormalizedArtist[];
};

type TokenCache = { token: string; expiresAt: number } | null;
let tokenCache: TokenCache = null;

export function _resetTokenCacheForTests() {
  tokenCache = null;
}

async function getSpotifyToken(): Promise<string> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id) throw new Error("SPOTIFY_CLIENT_ID not set");
  if (!secret) throw new Error("SPOTIFY_CLIENT_SECRET not set");

  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }

  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

type SpotifyTrackItem = {
  track: { name: string; artists: Array<{ name: string }> } | null;
};
type SpotifyPlaylistPage = {
  tracks: { items: SpotifyTrackItem[]; next: string | null };
};

export async function fetchSpotifyPlaylist(playlistId: string): Promise<NormalizedPlaylist> {
  const token = await getSpotifyToken();
  const url = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}?fields=tracks(items(track(name,artists(name))),next)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Spotify playlist fetch failed: ${res.status}`);
  }
  const json = (await res.json()) as SpotifyPlaylistPage;

  const tracks: NormalizedTrack[] = [];
  const artistCounts = new Map<string, number>();
  for (const item of json.tracks.items) {
    if (!item.track) continue;
    const t = item.track;
    const primary = t.artists[0]?.name ?? "Unknown";
    tracks.push({ title: t.name, artist: primary });
    for (const a of t.artists) {
      artistCounts.set(a.name, (artistCounts.get(a.name) ?? 0) + 1);
    }
  }
  const artists: NormalizedArtist[] = [...artistCounts.entries()]
    .map(([name, frequency]) => ({ name, frequency }))
    .sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name));

  return { tracks, artists };
}
