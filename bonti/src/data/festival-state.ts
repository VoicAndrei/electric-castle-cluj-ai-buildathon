export type Persona = {
  id: string;
  name: string;
  avatar_emoji: string;
  coords: { x: number; y: number };
  last_activity: string;
};

export type SeededPing = {
  id: string;
  fires_at: string; // ISO
  lang: "ro" | "en";
  title: string;
  body: string;
  deeplink?: string;
  urgent?: boolean;
};

export const DEMO_NOW = new Date("2026-07-18T21:43:00+03:00"); // Saturday, EC

// Coordinates are percentages-times-ten (0..1000) over the EC11 map image
// at /public/ec-map.png. Calibrated against the published EC11 isometric map.
export const MARIA: Persona = {
  id: "maria",
  name: "Maria",
  avatar_emoji: "🦋",
  coords: { x: 500, y: 600 }, // Royal Foodcourt
  last_activity: "at Royal Foodcourt · just now",
};

export const FRIENDS: Persona[] = [
  { id: "alex",   name: "Alex",   avatar_emoji: "🐺", coords: { x: 300, y: 620 }, last_activity: "at Booha · 4 min ago" },
  { id: "ioana",  name: "Ioana",  avatar_emoji: "🦊", coords: { x: 650, y: 250 }, last_activity: "near Main · 2 min ago" },
  { id: "andrei", name: "Andrei", avatar_emoji: "🐻", coords: { x: 250, y: 720 }, last_activity: "near Backyard · 6 min ago" },
];

export const SEEDED_PINGS: SeededPing[] = [
  {
    id: "ping-beach-21-15",
    fires_at: "2026-07-18T21:15:00+03:00",
    lang: "en",
    title: "Beach Stage is empty right now",
    body: "4 min walk. Beer and sand.",
    deeplink: "/app/compass?target=beach_stage",
  },
  {
    id: "ping-alex-20-50",
    fires_at: "2026-07-18T20:50:00+03:00",
    lang: "en",
    title: "Alex pinged you",
    body: '"where r u"',
    deeplink: "/app/group",
  },
  {
    id: "ping-booha-20-30",
    fires_at: "2026-07-18T20:30:00+03:00",
    lang: "en",
    title: "Booha set running 10 min late",
    body: "Schedule slipped slightly.",
    deeplink: "/app/lineup",
  },
  {
    id: "ping-shuttle-19-45",
    fires_at: "2026-07-18T19:45:00+03:00",
    lang: "ro",
    title: "⚡ Drumul înapoi e plin după Timberlake",
    body: "Shuttle-ul revine la 3. Stai la festival.",
    deeplink: "/app/notifications",
  },
];

// The Glass Animals ping fired live 8s after /app mount uses DEMO_NOW + 8s as fires_at.
// Its body is built dynamically (so we can localize); the static template lives here.
export const LIVE_GLASS_ANIMALS_PING: Omit<SeededPing, "fires_at"> = {
  id: "ping-glass-animals-live",
  lang: "en",
  title: "Glass Animals in 10 min at Main",
  body: "Your match.",
  deeplink: "/app/compass?target=main_stage",
};
