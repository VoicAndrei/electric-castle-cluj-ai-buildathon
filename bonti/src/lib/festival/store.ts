import { create, type StoreApi } from "zustand";
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

export type FestivalState = {
  maria: Persona;
  friends: Persona[];
  pings: StoredPing[];
  group_meeting?: { point_id: string; eta_min: number; reason: string };

  appendPing: (p: SeededPing) => void;
  applyGroupConverge: (r: GroupConvergeResult) => void;
  markAllPingsRead: () => void;
  reset: () => void;
};

export type FestivalStoreApi = StoreApi<FestivalState>;

const seed = (): Pick<FestivalState, "maria" | "friends" | "pings"> => ({
  maria: { ...MARIA },
  friends: FRIENDS.map(f => ({ ...f })),
  pings: SEEDED_PINGS.map(p => ({ ...p, read: false, received_at: p.fires_at })),
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
      (set, get) => ({
        ...seed(),

        appendPing: (p) =>
          set((state) => ({
            pings: [
              { ...p, read: false, received_at: new Date().toISOString() },
              ...state.pings,
            ],
          })),

        applyGroupConverge: (r) =>
          set((state) => ({
            maria: { ...state.maria, coords: r.target_coords },
            friends: state.friends.map(f => ({ ...f, coords: r.target_coords })),
            group_meeting: { point_id: r.meeting_point_id, eta_min: r.eta_min, reason: r.reason },
          })),

        markAllPingsRead: () =>
          set((state) => ({ pings: state.pings.map(p => ({ ...p, read: true })) })),

        reset: () => set(() => ({ ...seed(), group_meeting: undefined })),
      }),
      {
        name: "bonti_festival_state",
        storage: createJSONStorage(() => cookieStorage),
        partialize: (s) => ({
          maria: s.maria,
          friends: s.friends,
          pings: s.pings,
          group_meeting: s.group_meeting,
        }),
      },
    ),
  );
}

// Module-level singleton for client components.
export const useFestivalStore = createFestivalStore();
