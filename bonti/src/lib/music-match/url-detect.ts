export type MusicSource = "spotify_url" | "ytmusic_url" | "apple_url";

export function detectSource(input: string): MusicSource | null {
  const url = safeUrl(input);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (host === "open.spotify.com" && url.pathname.startsWith("/playlist/")) return "spotify_url";
  if (host === "music.youtube.com" || host === "www.youtube.com" || host === "youtube.com") {
    if (url.searchParams.has("list")) return "ytmusic_url";
  }
  if (host === "music.apple.com" && url.pathname.includes("/playlist/")) return "apple_url";
  return null;
}

export function extractSpotifyPlaylistId(input: string): string | null {
  const url = safeUrl(input);
  if (!url || url.hostname.toLowerCase() !== "open.spotify.com") return null;
  const match = url.pathname.match(/^\/playlist\/([A-Za-z0-9]+)\/?$/);
  return match ? match[1] : null;
}

function safeUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}
