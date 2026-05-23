import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { fetchSpotifyPlaylist, _resetTokenCacheForTests } from "@/lib/music-match/spotify";

const FAKE_TOKEN_RESPONSE = {
  ok: true,
  status: 200,
  json: async () => ({ access_token: "fake-token", expires_in: 3600, token_type: "Bearer" }),
} as unknown as Response;

const FAKE_PLAYLIST_RESPONSE = {
  ok: true,
  status: 200,
  json: async () => ({
    tracks: {
      items: [
        { track: { name: "Heat Waves", artists: [{ name: "Glass Animals" }] } },
        { track: { name: "Lost in Yesterday", artists: [{ name: "Tame Impala" }] } },
        { track: { name: "Glass Animals deep cut", artists: [{ name: "Glass Animals" }] } },
        { track: null },
      ],
      next: null,
    },
  }),
} as unknown as Response;

describe("fetchSpotifyPlaylist", () => {
  beforeEach(() => {
    process.env.SPOTIFY_CLIENT_ID = "id";
    process.env.SPOTIFY_CLIENT_SECRET = "secret";
    _resetTokenCacheForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches the token then the playlist, normalizes artists with frequency", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(FAKE_TOKEN_RESPONSE)
      .mockResolvedValueOnce(FAKE_PLAYLIST_RESPONSE);

    const result = await fetchSpotifyPlaylist("playlist123");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://accounts.spotify.com/api/token");
    expect((fetchMock.mock.calls[1][0] as string)).toContain("/playlists/playlist123");

    expect(result.tracks).toHaveLength(3); // null track filtered out
    expect(result.artists).toEqual([
      { name: "Glass Animals", frequency: 2 },
      { name: "Tame Impala", frequency: 1 },
    ]);
  });

  it("throws if creds are missing", async () => {
    delete process.env.SPOTIFY_CLIENT_ID;
    await expect(fetchSpotifyPlaylist("p1")).rejects.toThrow(/SPOTIFY_CLIENT_ID/);
  });
});
