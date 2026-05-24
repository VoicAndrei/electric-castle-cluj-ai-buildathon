import { create, type StoreApi, type UseBoundStore } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  MARIA, FRIENDS, SEEDED_PINGS, type Persona, type SeededPing,
} from "@/data/festival-state";

export type StoredPing = SeededPing & { read: boolean; received_at: string };

export type GroupConvergeResult = {
  meeting_point_id: string;
  eta_min: number;
  reason: string;
  target_coords: { x: number; y: number };
};

export type GroupMeeting = {
  point_id?: string;
  coords: { x: number; y: number };
  eta_min?: number;
  reason?: string;
  source: "bonti" | "manual";
};

export type FestivalState = {
  maria: Persona;
  friends: Persona[];
  pings: StoredPing[];
  silentPingIds: string[];
  group_meeting?: GroupMeeting;

  appendPing: (p: SeededPing, opts?: { silent?: boolean }) => void;
  applyGroupConverge: (r: GroupConvergeResult) => void;
  setManualMeeting: (coords: { x: number; y: number }) => void;
  clearMeeting: () => void;
  markAllPingsRead: () => void;
  reset: () => void;
};

export type FestivalStoreApi = UseBoundStore<StoreApi<FestivalState>>;

const seed = (): Pick<FestivalState, "maria" | "friends" | "pings" | "silentPingIds"> => ({
  maria: { ...MARIA },
  friends: FRIENDS.map(f => ({ ...f })),
  pings: SEEDED_PINGS.map(p => ({ ...p, read: false, received_at: p.fires_at })),
  silentPingIds: [],
});

// Cookie-backed storage using document.cookie (24h TTL).
const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(key)}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof document === "undefined") return;
    const maxAge = 60 * 60 * 24; // 24h
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  },
  removeItem: (key: string): void => {
    if (typeof document === "undefined") return;
    document.cookie = `${encodeURIComponent(key)}=; Path=/; Max-Age=0; SameSite=Lax`;
  },
};

export function createFestivalStore(): FestivalStoreApi {
  return create<FestivalState>()(
    persist(
      (set) => ({
        ...seed(),

        appendPing: (p, opts) =>
          set((state) => {
            const alreadyPresent = state.pings.some(existing => existing.id === p.id);
            if (alreadyPresent) {
              if (opts?.silent && !state.silentPingIds.includes(p.id)) {
                return { silentPingIds: [...state.silentPingIds, p.id] };
              }
              return {};
            }
            const next: Partial<FestivalState> = {
              pings: [
                { ...p, read: false, received_at: new Date().toISOString() },
                ...state.pings,
              ],
            };
            if (opts?.silent) {
              next.silentPingIds = [...state.silentPingIds, p.id];
            }
            return next;
          }),

        applyGroupConverge: (r) =>
          set(() => ({
            // Intentionally not teleporting Maria + friends to the meeting
            // point. The route map already draws the path from each pin to
            // the meeting marker; snapping every pin onto the marker hid
            // that signal and made the demo feel buggy on reload (persisted
            // teleported coords would briefly pop back to seed values and
            // then jump to the marker again).
            group_meeting: {
              point_id: r.meeting_point_id,
              coords: r.target_coords,
              eta_min: r.eta_min,
              reason: r.reason,
              source: "bonti",
            },
          })),

        setManualMeeting: (coords) =>
          set(() => ({
            group_meeting: { coords, source: "manual" },
          })),

        clearMeeting: () => set(() => ({ group_meeting: undefined })),

        markAllPingsRead: () =>
          set((state) => ({ pings: state.pings.map(p => ({ ...p, read: true })) })),

        reset: () => set(() => ({ ...seed(), group_meeting: undefined })),
      }),
      {
        name: "bonti_festival_state",
        version: 2,
        storage: createJSONStorage(() => cookieStorage),
        // Do not persist maria/friends so their coordinates always come from
        // the fresh seed on reload. Older sessions wrote teleported pins
        // into the cookie via the previous applyGroupConverge behavior,
        // which caused the "everyone snaps to the meeting marker on
        // refresh" glitch. The version bump invalidates that legacy state.
        partialize: (s) => ({
          pings: s.pings,
          group_meeting: s.group_meeting,
          // silentPingIds intentionally excluded — runtime-only. After a
          // reload, broadcasts re-hydrate via useBroadcastsRealtime.
        }),
      },
    ),
  );
}

// Module-level singleton for client components.
export const useFestivalStore = createFestivalStore();
