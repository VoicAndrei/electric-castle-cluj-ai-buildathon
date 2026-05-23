import { describe, it, expect } from "vitest";
import { detectSource, extractSpotifyPlaylistId } from "@/lib/music-match/url-detect";

describe("detectSource", () => {
  it("detects Spotify playlist URLs", () => {
    expect(detectSource("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")).toBe("spotify_url");
    expect(detectSource("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc")).toBe("spotify_url");
  });

  it("detects YT Music URLs", () => {
    expect(detectSource("https://music.youtube.com/playlist?list=PLabc")).toBe("ytmusic_url");
    expect(detectSource("https://www.youtube.com/playlist?list=PLabc")).toBe("ytmusic_url");
  });

  it("detects Apple Music URLs", () => {
    expect(detectSource("https://music.apple.com/us/playlist/chill/pl.abc")).toBe("apple_url");
  });

  it("returns null for non-playlist URLs", () => {
    expect(detectSource("https://example.com")).toBeNull();
    expect(detectSource("not a url")).toBeNull();
    expect(detectSource("")).toBeNull();
  });
});

describe("extractSpotifyPlaylistId", () => {
  it("extracts the playlist ID", () => {
    expect(extractSpotifyPlaylistId("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")).toBe("37i9dQZF1DXcBWIGoYBM5M");
    expect(extractSpotifyPlaylistId("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=xyz")).toBe("37i9dQZF1DXcBWIGoYBM5M");
  });

  it("returns null for non-playlist URLs", () => {
    expect(extractSpotifyPlaylistId("https://open.spotify.com/track/abc")).toBeNull();
    expect(extractSpotifyPlaylistId("garbage")).toBeNull();
  });
});
