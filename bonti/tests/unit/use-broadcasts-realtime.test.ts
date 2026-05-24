// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { BroadcastRow } from "@/lib/festival/broadcast-to-ping";

const mockRows: BroadcastRow[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    final_en: "Hist EN", final_ro: "Hist RO",
    title_en: "Hist", title_ro: "Hist",
    deeplink: null, target_venue_id: null,
    urgency: "standard",
    sent_at: "2026-07-18T19:45:00+03:00",
  },
];

let onInsertHandler: ((payload: { new: BroadcastRow }) => void) | null = null;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        gte: () => ({
          order: () => Promise.resolve({ data: mockRows, error: null }),
        }),
      }),
    }),
    channel: () => ({
      on: (_event: string, _opts: unknown, cb: (p: { new: BroadcastRow }) => void) => {
        onInsertHandler = cb;
        return {
          subscribe: () => ({ unsubscribe: vi.fn() }),
        };
      },
    }),
    removeChannel: vi.fn(),
  }),
}));

const appendPingMock = vi.fn();
vi.mock("@/lib/festival/store", () => ({
  useFestivalStore: Object.assign(
    (selector: (s: { appendPing: typeof appendPingMock }) => unknown) =>
      selector({ appendPing: appendPingMock }),
    { getState: () => ({ appendPing: appendPingMock }) },
  ),
}));

import { useBroadcastsRealtime } from "@/hooks/use-broadcasts-realtime";

describe("useBroadcastsRealtime", () => {
  beforeEach(() => {
    appendPingMock.mockClear();
    onInsertHandler = null;
  });

  it("hydrates from SELECT on mount with silent: true", async () => {
    renderHook(() => useBroadcastsRealtime({ lang: "ro" }));
    await act(async () => { await Promise.resolve(); });
    expect(appendPingMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "broadcast-00000000-0000-0000-0000-000000000001" }),
      { silent: true },
    );
  });

  it("forwards live Realtime INSERTs without silent flag", async () => {
    renderHook(() => useBroadcastsRealtime({ lang: "ro" }));
    await act(async () => { await Promise.resolve(); });
    appendPingMock.mockClear();

    expect(onInsertHandler).not.toBeNull();
    act(() => {
      onInsertHandler!({
        new: {
          id: "22222222-2222-2222-2222-222222222222",
          final_en: "Live EN", final_ro: "Live RO",
          title_en: "Live", title_ro: "Live",
          deeplink: null, target_venue_id: null,
          urgency: "standard",
          sent_at: "2026-07-18T22:10:00+03:00",
        },
      });
    });

    expect(appendPingMock).toHaveBeenCalledTimes(1);
    const [pingArg, optsArg] = appendPingMock.mock.calls[0];
    expect(pingArg).toMatchObject({ id: "broadcast-22222222-2222-2222-2222-222222222222" });
    expect(optsArg).toBeUndefined();
  });
});
