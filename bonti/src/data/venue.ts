export type VenueKind =
  | "stage" | "beer" | "food" | "bathroom"
  | "beach" | "campsite" | "village" | "shuttle" | "first_aid";

export type VenuePoint = {
  id: string;
  name: string;
  kind: VenueKind;
  coords: { x: number; y: number };
  ec_tag?: string;
  lineProbability?: "low" | "med" | "high";
  queueState?: { density: "low" | "med" | "high"; estimateMin: number };
  bonti_blurb?: string;
};

export const METERS_PER_UNIT = 0.4;

export const VENUE: VenuePoint[] = [
  // Stages (laid out roughly like EC's actual venue topology)
  { id: "main_stage",    name: "Main Stage",    kind: "stage", coords: { x: 500, y: 320 }, ec_tag: "main",   bonti_blurb: "Biggest crowd, best for headliners." },
  { id: "hangar_stage",  name: "Hangar Stage",  kind: "stage", coords: { x: 700, y: 480 }, ec_tag: "hangar", bonti_blurb: "Indoor, electronic, gets loud after midnight." },
  { id: "booha_stage",   name: "Booha Stage",   kind: "stage", coords: { x: 360, y: 560 }, ec_tag: "booha",  bonti_blurb: "Smaller, weirder, the discovery stage." },
  { id: "banffy_stage",  name: "Banffy Castle", kind: "stage", coords: { x: 500, y: 200 }, ec_tag: "banffy", bonti_blurb: "Inside the castle. Strings and atmosphere." },
  { id: "beach_stage",   name: "The Beach",     kind: "beach", coords: { x: 220, y: 740 }, ec_tag: "beach",  bonti_blurb: "Sand, lake, beats. Recovery zone." },

  // Smaller stages from the EC25 lineup that weren't in the original venue
  // catalog. Coords are approximations spaced around the map so artist
  // lookups have somewhere distinct to point.
  { id: "hideout_stage",  name: "Hideout Stage",  kind: "stage", coords: { x: 640, y: 200 }, ec_tag: "hideout",  bonti_blurb: "Tucked-away electronic stage." },
  { id: "backyard_stage", name: "Backyard Stage", kind: "stage", coords: { x: 260, y: 380 }, ec_tag: "backyard", bonti_blurb: "Outdoor, daytime, organic vibes." },
  { id: "ping_pong_stage", name: "Ping Pong Stage", kind: "stage", coords: { x: 820, y: 580 }, ec_tag: "pingpong", bonti_blurb: "Underground, late-night basement energy." },
  { id: "stables_stage",  name: "Stables Stage",  kind: "stage", coords: { x: 300, y: 240 }, ec_tag: "stables",  bonti_blurb: "Stone walls, intimate sets." },

  // Beer
  { id: "beer_garden_n", name: "Beer Garden North", kind: "beer", coords: { x: 540, y: 380 }, lineProbability: "low",  bonti_blurb: "Closest to Main. Always moves fast." },
  { id: "beer_garden_s", name: "Beer Garden South", kind: "beer", coords: { x: 460, y: 600 }, lineProbability: "med",  bonti_blurb: "Between Booha and food. Crowded around set times." },
  { id: "beer_hangar",   name: "Beer @ Hangar",     kind: "beer", coords: { x: 740, y: 500 }, lineProbability: "high", bonti_blurb: "Long lines after midnight." },

  // Food
  { id: "food_court",    name: "Food Court",     kind: "food", coords: { x: 480, y: 660 }, lineProbability: "med", bonti_blurb: "Most options. Pizza line is fastest." },
  { id: "burger_truck",  name: "Burger Truck",   kind: "food", coords: { x: 620, y: 640 }, lineProbability: "high" },
  { id: "vegan_corner",  name: "Vegan Corner",   kind: "food", coords: { x: 420, y: 700 }, lineProbability: "low" },

  // Bathrooms
  { id: "wc_main",       name: "Bathrooms · Main",    kind: "bathroom", coords: { x: 460, y: 360 }, lineProbability: "high" },
  { id: "wc_hangar",     name: "Bathrooms · Hangar",  kind: "bathroom", coords: { x: 760, y: 460 }, lineProbability: "med" },
  { id: "wc_campsite_c", name: "Bathrooms · Block C", kind: "bathroom", coords: { x: 820, y: 760 }, lineProbability: "low" },

  // Campsite blocks
  { id: "camp_a",        name: "Campsite Block A", kind: "campsite", coords: { x: 760, y: 720 } },
  { id: "camp_b",        name: "Campsite Block B", kind: "campsite", coords: { x: 820, y: 720 } },
  { id: "camp_c",        name: "Campsite Block C", kind: "campsite", coords: { x: 820, y: 760 } },

  // Village + misc
  { id: "ec_village",    name: "EC Village",  kind: "village", coords: { x: 600, y: 720 }, bonti_blurb: "Slow zone. Coffee, hammocks, weird talks." },
  { id: "shuttle_drop",  name: "Shuttle Drop", kind: "shuttle", coords: { x: 120, y: 880 } },
  { id: "first_aid",     name: "First Aid",    kind: "first_aid", coords: { x: 540, y: 420 } },
];

// Default seeded queue snapshots (mutable in implementation; cycled by /app/wait-times refresh)
export const QUEUE_SNAPSHOTS: Record<string, { density: "low" | "med" | "high"; estimateMin: number }>[] = [
  {
    beer_garden_n: { density: "low",  estimateMin: 3 },
    beer_garden_s: { density: "med",  estimateMin: 7 },
    beer_hangar:   { density: "high", estimateMin: 14 },
    food_court:    { density: "med",  estimateMin: 8 },
    burger_truck:  { density: "high", estimateMin: 12 },
    vegan_corner:  { density: "low",  estimateMin: 4 },
    wc_main:       { density: "high", estimateMin: 6 },
    wc_hangar:     { density: "med",  estimateMin: 3 },
    wc_campsite_c: { density: "low",  estimateMin: 1 },
  },
  {
    beer_garden_n: { density: "med",  estimateMin: 5 },
    beer_garden_s: { density: "high", estimateMin: 11 },
    beer_hangar:   { density: "high", estimateMin: 16 },
    food_court:    { density: "high", estimateMin: 13 },
    burger_truck:  { density: "high", estimateMin: 18 },
    vegan_corner:  { density: "med",  estimateMin: 7 },
    wc_main:       { density: "high", estimateMin: 9 },
    wc_hangar:     { density: "med",  estimateMin: 4 },
    wc_campsite_c: { density: "low",  estimateMin: 2 },
  },
  {
    beer_garden_n: { density: "low",  estimateMin: 2 },
    beer_garden_s: { density: "low",  estimateMin: 4 },
    beer_hangar:   { density: "med",  estimateMin: 8 },
    food_court:    { density: "med",  estimateMin: 6 },
    burger_truck:  { density: "med",  estimateMin: 9 },
    vegan_corner:  { density: "low",  estimateMin: 3 },
    wc_main:       { density: "med",  estimateMin: 4 },
    wc_hangar:     { density: "low",  estimateMin: 2 },
    wc_campsite_c: { density: "low",  estimateMin: 1 },
  },
];
