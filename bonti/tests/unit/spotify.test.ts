import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { fetchSpotifyPlaylist } from "@/lib/music-match/spotify";

// The embed page returns full HTML with __NEXT_DATA__ containing a trackList.
// We test the scrape against a realistic shape — NBSP-separated artists in
// `subtitle`, mixed playable / non-playable items, and a nested structure.
function makeEmbedHtml(tracks: Array<{ title: string; subtitle: string }>): string {
  const nextData = {
    props: {
      pageProps: {
        state: {
          data: {
            entity: {
              trackList: tracks.map((t, i) => ({
                uri: `spotify:track:${i}`,
                title: t.title,
                subtitle: t.subtitle,
              })),
            },
          },
        },
      },
    },
  };
  return `<!doctype html><html><head></head><body>
    <script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>
  </body></html>`;
}

function makeFetchResponse(html: string, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: async () => html,
  } as unknown as Response;
}

describe("fetchSpotifyPlaylist (embed scrape)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scrapes trackList and normalizes artists with frequency", async () => {
    const html = makeEmbedHtml([
      { title: "Heat Waves", subtitle: "Glass Animals" },
      { title: "Lost in Yesterday", subtitle: "Tame Impala" },
      { title: "Gooey", subtitle: "Glass Animals" },
    ]);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(makeFetchResponse(html));

    const result = await fetchSpotifyPlaylist("playlist123");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/embed/playlist/playlist123");
    expect(result.tracks).toHaveLength(3);
    expect(result.tracks[0]).toEqual({ title: "Heat Waves", artist: "Glass Animals" });
    expect(result.artists).toEqual([
      { name: "Glass Animals", frequency: 2 },
      { name: "Tame Impala", frequency: 1 },
    ]);
  });

  it("splits NBSP-separated multi-artist subtitles", async () => {
    // U+00A0 (non-breaking space) is what Spotify actually uses after the comma
    const html = makeEmbedHtml([
      { title: "Lovers on the Sun", subtitle: "David Guetta, Sam Martin" },
    ]);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeFetchResponse(html));

    const result = await fetchSpotifyPlaylist("p");

    expect(result.tracks[0].artist).toBe("David Guetta");
    expect(result.artists.map((a) => a.name).sort()).toEqual(["David Guetta", "Sam Martin"]);
  });

  it("throws a clear error on empty playlist", async () => {
    const html = makeEmbedHtml([]);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeFetchResponse(html));

    await expect(fetchSpotifyPlaylist("p")).rejects.toThrow(/empty|private/i);
  });

  it("throws on non-2xx embed response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeFetchResponse("", false, 404),
    );
    await expect(fetchSpotifyPlaylist("p")).rejects.toThrow(/HTTP 404/);
  });

  it("throws when __NEXT_DATA__ is missing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeFetchResponse("<!doctype html><body>nothing</body></html>"),
    );
    await expect(fetchSpotifyPlaylist("p")).rejects.toThrow(/__NEXT_DATA__/);
  });
});
