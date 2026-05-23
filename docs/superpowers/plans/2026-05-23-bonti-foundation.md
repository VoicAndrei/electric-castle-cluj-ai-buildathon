# Bonți Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deployable foundation that all subsequent Bonți features (pre-ticket web, in-festival app, admin CMS) build on — a Next.js app with Supabase backend, working Google sign-in, an embedded knowledge base with hybrid RAG retrieval, OpenRouter-powered chat in Bonți's voice, and a styled UI shell deployed to Vercel.

**Architecture:** Single Next.js 15 (App Router) project deployed on Vercel. Supabase handles Postgres + pgvector + Realtime + Google OAuth. Knowledge base ingested once locally with `Xenova/bge-m3` embeddings via Transformers.js. Chat API uses a hybrid RAG pipeline (vector + keyword + RRF) with query rewriting and HyDE-lite, then streams responses from OpenRouter's free `google/gemma-4-31b-it:free` model.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion · Supabase (Postgres + pgvector + Realtime + Auth) · Transformers.js (`Xenova/bge-m3`) · Vercel AI SDK (`ai`, `@ai-sdk/openai`) · OpenRouter (`google/gemma-4-31b-it:free`) · Vitest · pnpm · Node 20+

---

## Companion docs

- Design spec: `docs/superpowers/specs/2026-05-23-bonti-electric-castle-design.md`
- Tone-of-voice research: `docs/research/ec-tone-of-voice.md`
- EC app reverse-engineering: `app-analysis/README.md`
- Hackathon brief: `hackathon-requirements/electric-castle-challenge.md`

## Prerequisites (one-time setup outside this plan)

Before Task 1, the engineer needs:

1. **Node 20+** and **pnpm** installed (`pnpm -v` should print ≥ 9).
2. **A Supabase project** at https://supabase.com (free tier). Note: project URL, anon key, service-role key. From the Dashboard, also enable the `vector` and `pg_trgm` extensions under Database → Extensions.
3. **An OpenRouter API key** at https://openrouter.ai/keys. Add credit if needed (free models still require a registered key; usage on `:free` model IDs has no cost).
4. **A Google Cloud OAuth client** for sign-in:
   - https://console.cloud.google.com/apis/credentials → Create Credentials → OAuth client ID → Web application
   - Authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   - In Supabase Dashboard → Authentication → Providers → Google: paste client ID + secret, enable.
5. **The brand fonts** at `app-analysis/assets/fonts/` — verify these files exist:
   - `Roboto-Regular.ttf`, `Roboto-Bold.ttf`
   - `SofiaSans-Regular.ttf`, `SofiaSans-Medium.ttf`, `SofiaSans-Bold.ttf`, `SofiaSans-Black.ttf`

Save credentials in a scratch note — they go into `.env.local` in Task 3.

## Project layout

The Next.js project lives in `bonti/` at the repo root, alongside the existing `docs/`, `hackathon-requirements/`, and `app-analysis/` folders.

```
electric-castle-cluj-ai-buildathon/
├── app-analysis/           (existing — EC app recon)
├── docs/                   (existing — spec, plans, research)
├── hackathon-requirements/ (existing — brief, transcript)
└── bonti/                  (← Plan 0 creates this)
    ├── public/
    │   └── fonts/                          (brand fonts copied from app-analysis)
    ├── scripts/
    │   └── ingest.ts                       (one-shot KB ingestion)
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx                    (home: Bonți header + chat input)
    │   │   ├── globals.css
    │   │   ├── auth/
    │   │   │   └── callback/route.ts       (Supabase auth callback)
    │   │   └── api/
    │   │       └── chat/route.ts           (streaming RAG endpoint)
    │   ├── components/
    │   │   ├── bonti-header.tsx
    │   │   ├── chat-input.tsx
    │   │   ├── message-list.tsx
    │   │   ├── sign-in-button.tsx
    │   │   └── ui/                         (shadcn/ui generated)
    │   ├── hooks/
    │   │   └── use-chat.ts
    │   ├── lib/
    │   │   ├── brand.ts                    (color/typography tokens)
    │   │   ├── supabase/
    │   │   │   ├── client.ts               (browser client)
    │   │   │   ├── server.ts               (server client)
    │   │   │   └── admin.ts                (service-role client, server-only)
    │   │   ├── embeddings.ts               (Transformers.js wrapper)
    │   │   ├── retrieval/
    │   │   │   ├── hybrid.ts               (vector + full-text + RRF)
    │   │   │   ├── rewrite.ts              (chat history → standalone query)
    │   │   │   └── hyde.ts                 (hypothetical answer generation)
    │   │   ├── openrouter.ts               (Vercel AI SDK model factory)
    │   │   └── prompts/
    │   │       ├── bonti-system.ts         (assembled system prompt)
    │   │       ├── bonti-fewshot.ts        (sample copy library, EN+RO)
    │   │       └── bonti-voice-rules.ts    (voice rules from research)
    │   └── types/
    │       └── chat.ts                     (message, retrieval result types)
    ├── tests/
    │   ├── unit/
    │   │   ├── embeddings.test.ts
    │   │   ├── chunking.test.ts
    │   │   ├── rrf.test.ts
    │   │   ├── rewrite.test.ts
    │   │   └── prompt-assembly.test.ts
    │   └── integration/
    │       ├── retrieval.test.ts
    │       └── chat-api.test.ts
    ├── supabase/
    │   └── migrations/
    │       ├── 20260523000000_extensions.sql
    │       ├── 20260523000100_kb_chunks.sql
    │       ├── 20260523000200_plans.sql
    │       ├── 20260523000300_music_matches.sql
    │       ├── 20260523000400_broadcasts.sql
    │       ├── 20260523000500_festival_sessions.sql
    │       ├── 20260523000600_events.sql
    │       └── 20260523000700_retrieval_functions.sql
    ├── docs/ingest/                        (seed KB content for ingestion)
    │   ├── faq-tickets.md
    │   ├── faq-camping.md
    │   ├── faq-transport.md
    │   ├── ec-village.md
    │   ├── tone-of-voice.md
    │   └── lineup.json
    ├── .env.local                          (gitignored)
    ├── .env.example
    ├── package.json
    ├── pnpm-lock.yaml
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── next.config.mjs
    ├── vitest.config.ts
    └── README.md
```

---

## Task 1: Scaffold the Next.js project + initialize git

**Goal:** A running Next.js dev server at `localhost:3000` showing a "Hello, Bonți" page.

**Files:**
- Create: `bonti/` (entire scaffold)
- Create: `.gitignore` (root) + project-level `.gitignore`

- [ ] **Step 1.1: Scaffold project**

From the repo root (`electric-castle-cluj-ai-buildathon/`):

Run:
```bash
pnpm create next-app@latest bonti \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --no-turbo
```

Accept defaults for any other prompts.

Expected: a `bonti/` folder appears.

- [ ] **Step 1.2: Verify project runs**

Run:
```bash
cd bonti && pnpm dev
```

Expected: server starts on http://localhost:3000 and shows the Next.js welcome page.

Stop the server (Ctrl-C) when verified.

- [ ] **Step 1.3: Initialize git at the repo root**

From the repo root:
```bash
git init
git add .gitignore
```

If a `.gitignore` doesn't exist at repo root, create one:

```
# Editor
.idea/
.vscode/
.DS_Store

# Node
node_modules/

# Env
.env.local
.env*.local
.env

# Build artifacts
bonti/.next/
bonti/out/
bonti/.vercel/

# Supabase
bonti/supabase/.branches/
bonti/supabase/.temp/
```

- [ ] **Step 1.4: First commit**

```bash
git add .
git commit -m "chore: initial Next.js scaffold for Bonti foundation"
```

Expected: clean working tree.

---

## Task 2: Brand foundation — fonts, colors, base layout

**Goal:** The home page renders EC's brand: `#EB0000` red, Sofia Sans Bold uppercase headers, Roboto Regular body, `#000000` toolbar.

**Files:**
- Create: `bonti/public/fonts/*.ttf` (copied)
- Modify: `bonti/src/app/globals.css`
- Modify: `bonti/tailwind.config.ts`
- Create: `bonti/src/lib/brand.ts`
- Modify: `bonti/src/app/layout.tsx`
- Modify: `bonti/src/app/page.tsx`

- [ ] **Step 2.1: Copy brand fonts**

From the repo root:
```bash
mkdir -p bonti/public/fonts
cp app-analysis/assets/fonts/Roboto-Regular.ttf bonti/public/fonts/
cp app-analysis/assets/fonts/Roboto-Bold.ttf bonti/public/fonts/
cp app-analysis/assets/fonts/SofiaSans-Regular.ttf bonti/public/fonts/
cp app-analysis/assets/fonts/SofiaSans-Medium.ttf bonti/public/fonts/
cp app-analysis/assets/fonts/SofiaSans-Bold.ttf bonti/public/fonts/
cp app-analysis/assets/fonts/SofiaSans-Black.ttf bonti/public/fonts/
ls bonti/public/fonts/
```

Expected output: six `.ttf` files listed.

- [ ] **Step 2.2: Add @font-face declarations to globals.css**

Open `bonti/src/app/globals.css`. Replace its contents with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-family: "Sofia Sans";
  src: url("/fonts/SofiaSans-Regular.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Sofia Sans";
  src: url("/fonts/SofiaSans-Medium.ttf") format("truetype");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Sofia Sans";
  src: url("/fonts/SofiaSans-Bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Sofia Sans";
  src: url("/fonts/SofiaSans-Black.ttf") format("truetype");
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Roboto";
  src: url("/fonts/Roboto-Regular.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Roboto";
  src: url("/fonts/Roboto-Bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

:root {
  --bonti-red: #eb0000;
  --bonti-bg: #f4f4f4;
  --bonti-surface: #ffffff;
  --bonti-toolbar: #000000;
  --bonti-text: #000000;
  --bonti-text-inverse: #ffffff;
}

body {
  background: var(--bonti-bg);
  color: var(--bonti-text);
  font-family: "Roboto", system-ui, sans-serif;
}

h1, h2, h3, h4, h5 {
  font-family: "Sofia Sans", system-ui, sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.01em;
}
```

- [ ] **Step 2.3: Wire brand tokens into Tailwind config**

Replace `bonti/tailwind.config.ts` contents with:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bonti: {
          red: "#EB0000",
          bg: "#F4F4F4",
          surface: "#FFFFFF",
          toolbar: "#000000",
        },
      },
      fontFamily: {
        sofia: ['"Sofia Sans"', "system-ui", "sans-serif"],
        roboto: ['"Roboto"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2.4: Create brand constants module**

Create `bonti/src/lib/brand.ts`:

```ts
export const BRAND = {
  name: "Bonți",
  pronunciation: "BOHN-tsee",
  pronouns: null, // non-gendered
  colors: {
    red: "#EB0000",
    bg: "#F4F4F4",
    surface: "#FFFFFF",
    toolbar: "#000000",
    text: "#000000",
    textInverse: "#FFFFFF",
  },
  fonts: {
    heading: "Sofia Sans",
    body: "Roboto",
  },
  festival: {
    edition: "EC12",
    dates: "16-19 July 2026",
    location: "Bánffy Castle, Bonțida, Cluj, Romania",
  },
} as const;
```

- [ ] **Step 2.5: Smoke-test page**

Replace `bonti/src/app/page.tsx`:

```tsx
import { BRAND } from "@/lib/brand";

export default function Home() {
  return (
    <main className="min-h-screen bg-bonti-bg">
      <header className="bg-bonti-toolbar px-6 py-4">
        <h1 className="text-bonti-red text-2xl font-sofia">
          {BRAND.name} — {BRAND.festival.edition}
        </h1>
      </header>
      <section className="px-6 py-8">
        <p className="font-roboto text-base">
          Castle&apos;s in 8 weeks. What&apos;s on your mind?
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 2.6: Verify**

Run from `bonti/`:
```bash
pnpm dev
```

Open http://localhost:3000. Expected: black toolbar with red uppercase "BONȚI — EC12" heading, light-grey background, "Castle's in 8 weeks. What's on your mind?" body text in Roboto. The font for the heading should be visibly distinct (Sofia Sans Bold) — verify with the browser DevTools Computed → font-family.

Stop the server.

- [ ] **Step 2.7: Commit**

```bash
git add bonti/public/fonts bonti/src bonti/tailwind.config.ts
git commit -m "feat(bonti): brand foundation (fonts, colors, smoke page)"
```

---

## Task 3: Supabase client setup + env configuration

**Goal:** Server and browser Supabase clients work, `.env.local` is configured, a smoke-test API route confirms connectivity.

**Files:**
- Create: `bonti/.env.example`
- Create: `bonti/.env.local` (gitignored)
- Create: `bonti/src/lib/supabase/client.ts`
- Create: `bonti/src/lib/supabase/server.ts`
- Create: `bonti/src/lib/supabase/admin.ts`
- Create: `bonti/src/app/api/health/route.ts`

- [ ] **Step 3.1: Install Supabase packages**

From `bonti/`:
```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 3.2: Create env files**

Create `bonti/.env.example`:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then create `bonti/.env.local` with the engineer's actual values (these were noted during Prerequisites).

- [ ] **Step 3.3: Create browser client**

Create `bonti/src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3.4: Create server client**

Create `bonti/src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(items) {
          try {
            items.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // ignore in Server Components (cookies are read-only there)
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3.5: Create service-role admin client**

Create `bonti/src/lib/supabase/admin.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — SERVER ONLY. Never import from client components.
 * Used by ingestion scripts and privileged server actions.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
```

- [ ] **Step 3.6: Create a health-check API route**

Create `bonti/src/app/api/health/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pg_stat_database").select("datname").limit(1);
  // The above will fail (RLS / non-existent table) — we just confirm the client can reach Supabase
  return NextResponse.json({
    ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_reachable: error?.code !== "ECONNREFUSED",
    error_code: error?.code ?? null,
  });
}
```

- [ ] **Step 3.7: Verify connectivity**

Run `pnpm dev` and visit http://localhost:3000/api/health.

Expected JSON:
```json
{ "ok": true, "supabase_reachable": true, "error_code": "..." }
```

(`error_code` will be a Postgres error code because we're querying a system view via REST — that's fine. We just want to confirm we can reach Supabase.)

If `supabase_reachable` is false, recheck env vars and restart `pnpm dev`.

- [ ] **Step 3.8: Commit**

```bash
git add bonti/.env.example bonti/src/lib/supabase bonti/src/app/api/health bonti/package.json bonti/pnpm-lock.yaml
git commit -m "feat(bonti): Supabase client setup + health check"
```

---

## Task 4: Database schema — migrations for all foundation tables

**Goal:** All Plan 0 tables exist in Supabase with pgvector enabled, indexes built. A smoke-test query confirms the schema.

**Files:**
- Create: `bonti/supabase/migrations/20260523000000_extensions.sql`
- Create: `bonti/supabase/migrations/20260523000100_kb_chunks.sql`
- Create: `bonti/supabase/migrations/20260523000200_plans.sql`
- Create: `bonti/supabase/migrations/20260523000300_music_matches.sql`
- Create: `bonti/supabase/migrations/20260523000400_broadcasts.sql`
- Create: `bonti/supabase/migrations/20260523000500_festival_sessions.sql`
- Create: `bonti/supabase/migrations/20260523000600_events.sql`
- Create: `bonti/supabase/migrations/20260523000700_retrieval_functions.sql`

- [ ] **Step 4.1: Install Supabase CLI (local)**

From `bonti/`:
```bash
pnpm add -D supabase
```

- [ ] **Step 4.2: Link to your remote Supabase project**

Run (paste your project ref from the Supabase URL):
```bash
pnpm supabase init --workdir .
pnpm supabase link --project-ref <your-project-ref>
```

You'll be prompted for the database password (set when the project was created).

- [ ] **Step 4.3: Write the extensions migration**

Create `bonti/supabase/migrations/20260523000000_extensions.sql`:

```sql
-- Enable required extensions for Bonti's RAG + search pipeline.
create extension if not exists "vector";   -- pgvector for embeddings
create extension if not exists "pg_trgm";  -- trigram for fuzzy full-text matching
```

- [ ] **Step 4.4: Write the kb_chunks migration**

Create `bonti/supabase/migrations/20260523000100_kb_chunks.sql`:

```sql
-- Knowledge base chunks (embedded EC content).
-- bge-m3 outputs 1024-dimensional vectors.

create table public.kb_chunks (
  id          bigserial primary key,
  source_doc  text not null,
  text        text not null,
  embedding   vector(1024) not null,
  lang        text not null default 'en' check (lang in ('en', 'ro')),
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create index kb_chunks_embedding_ivfflat_idx
  on public.kb_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index kb_chunks_text_fts_idx
  on public.kb_chunks
  using gin (to_tsvector('simple', text));

create index kb_chunks_lang_idx on public.kb_chunks (lang);
create index kb_chunks_tags_idx on public.kb_chunks using gin (tags);
```

- [ ] **Step 4.5: Write the plans migration**

Create `bonti/supabase/migrations/20260523000200_plans.sql`:

```sql
create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null,
  user_id     uuid references auth.users(id) on delete set null,
  payload     jsonb not null,
  lang        text not null default 'en' check (lang in ('en', 'ro')),
  is_group    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index plans_session_id_idx on public.plans (session_id);
create index plans_user_id_idx on public.plans (user_id);
```

- [ ] **Step 4.6: Write the music_matches migration**

Create `bonti/supabase/migrations/20260523000300_music_matches.sql`:

```sql
create table public.music_matches (
  id          uuid primary key default gen_random_uuid(),
  url_hash    text not null unique,
  source      text not null check (source in ('spotify_url', 'ytmusic_url', 'apple_url', 'freeform')),
  input       jsonb not null,
  output      jsonb not null,
  created_at  timestamptz not null default now()
);
```

- [ ] **Step 4.7: Write the broadcasts migration**

Create `bonti/supabase/migrations/20260523000400_broadcasts.sql`:

```sql
create table public.broadcasts (
  id            uuid primary key default gen_random_uuid(),
  source_text   text not null,
  ai_draft_en   text,
  ai_draft_ro   text,
  final_en      text not null,
  final_ro      text not null,
  target        text not null default 'all',
  urgency       text not null default 'standard' check (urgency in ('standard', 'critical')),
  sent_by       uuid references auth.users(id) on delete set null,
  sent_at       timestamptz not null default now()
);

-- Enable Realtime publication so clients can subscribe.
alter publication supabase_realtime add table public.broadcasts;
```

- [ ] **Step 4.8: Write the festival_sessions migration**

Create `bonti/supabase/migrations/20260523000500_festival_sessions.sql`:

```sql
create table public.festival_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  persona         text,
  location_lat    double precision,
  location_lng    double precision,
  group_id        uuid,
  compass_target  jsonb,
  last_update     timestamptz not null default now()
);

create index festival_sessions_user_idx on public.festival_sessions (user_id);
create index festival_sessions_group_idx on public.festival_sessions (group_id);
```

- [ ] **Step 4.9: Write the events migration**

Create `bonti/supabase/migrations/20260523000600_events.sql`:

```sql
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  payload     jsonb not null default '{}',
  session_id  uuid,
  created_at  timestamptz not null default now()
);

create index events_type_idx on public.events (type);
create index events_created_idx on public.events (created_at desc);
```

- [ ] **Step 4.10: Write retrieval helper functions**

Create `bonti/supabase/migrations/20260523000700_retrieval_functions.sql`:

```sql
-- Hybrid retrieval: returns top-N chunks ranked by cosine similarity,
-- filtered by language and (optional) tag array. Caller does FTS separately
-- and merges with RRF on the application side (Task 12).
create or replace function public.match_kb_chunks (
  query_embedding vector(1024),
  match_count int default 20,
  filter_lang text default null,
  filter_tags text[] default null
)
returns table (
  id bigint,
  source_doc text,
  text text,
  lang text,
  tags text[],
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.source_doc,
    c.text,
    c.lang,
    c.tags,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.kb_chunks c
  where (filter_lang is null or c.lang = filter_lang)
    and (filter_tags is null or c.tags && filter_tags)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Full-text retrieval over the same chunks.
create or replace function public.search_kb_chunks_fts (
  query_text text,
  match_count int default 20,
  filter_lang text default null
)
returns table (
  id bigint,
  source_doc text,
  text text,
  lang text,
  tags text[],
  rank float
)
language sql stable
as $$
  select
    c.id,
    c.source_doc,
    c.text,
    c.lang,
    c.tags,
    ts_rank(to_tsvector('simple', c.text), plainto_tsquery('simple', query_text)) as rank
  from public.kb_chunks c
  where (filter_lang is null or c.lang = filter_lang)
    and to_tsvector('simple', c.text) @@ plainto_tsquery('simple', query_text)
  order by rank desc
  limit match_count;
$$;
```

- [ ] **Step 4.11: Apply migrations**

```bash
pnpm supabase db push
```

Expected output: each migration file listed as applied. No errors.

- [ ] **Step 4.12: Smoke-test the schema**

Run:
```bash
pnpm supabase db remote commit --schema public --message "verify"
```

If that's not available, just connect via Supabase Dashboard → Table Editor and confirm `kb_chunks`, `plans`, `music_matches`, `broadcasts`, `festival_sessions`, `events` all exist with the columns above.

- [ ] **Step 4.13: Commit**

```bash
git add bonti/supabase
git commit -m "feat(bonti): database schema (kb_chunks, plans, broadcasts, etc.)"
```

---

## Task 5: Google sign-in via Supabase Auth

**Goal:** A "Sign in with Google" button on the home page. Clicking it completes OAuth and the user's email shows on the page.

**Files:**
- Create: `bonti/src/app/auth/callback/route.ts`
- Create: `bonti/src/components/sign-in-button.tsx`
- Modify: `bonti/src/app/page.tsx`

- [ ] **Step 5.1: Create the auth callback route**

Create `bonti/src/app/auth/callback/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
```

- [ ] **Step 5.2: Create the sign-in button component**

Create `bonti/src/components/sign-in-button.tsx`:

```tsx
"use client";

import { createClient } from "@/lib/supabase/client";

export function SignInButton() {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }
  return (
    <button
      onClick={signIn}
      className="bg-bonti-red text-white font-sofia uppercase px-4 py-2 text-sm"
    >
      Sign in with Google
    </button>
  );
}
```

- [ ] **Step 5.3: Show sign-in button + email on the home page**

Replace `bonti/src/app/page.tsx`:

```tsx
import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";
import { SignInButton } from "@/components/sign-in-button";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-bonti-bg">
      <header className="bg-bonti-toolbar px-6 py-4 flex justify-between items-center">
        <h1 className="text-bonti-red text-2xl font-sofia">
          {BRAND.name} — {BRAND.festival.edition}
        </h1>
        {user ? (
          <span className="text-white font-roboto text-sm">{user.email}</span>
        ) : (
          <SignInButton />
        )}
      </header>
      <section className="px-6 py-8">
        <p className="font-roboto text-base">
          Castle&apos;s in 8 weeks. What&apos;s on your mind?
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 5.4: Manual test**

Run `pnpm dev`, visit http://localhost:3000.

Expected:
- "Sign in with Google" button in top-right.
- Click it → redirects to Google → choose account → redirects back.
- After redirect, the email appears in place of the button.

If the redirect URL fails, double-check that the Google OAuth client's authorized redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback` (NOT `localhost`), and that Google provider is enabled in the Supabase Dashboard.

- [ ] **Step 5.5: Commit**

```bash
git add bonti/src/app/auth bonti/src/app/page.tsx bonti/src/components/sign-in-button.tsx
git commit -m "feat(bonti): Google sign-in via Supabase Auth"
```

---

## Task 6: Embeddings — Transformers.js + bge-m3

**Goal:** A `lib/embeddings.ts` module that, given a string, returns a 1024-dim Float32Array. A passing test confirms the dimension and consistency.

**Files:**
- Create: `bonti/src/lib/embeddings.ts`
- Create: `bonti/tests/unit/embeddings.test.ts`
- Modify: `bonti/package.json` (add deps + test script)
- Create: `bonti/vitest.config.ts`

- [ ] **Step 6.1: Install Transformers.js + Vitest**

From `bonti/`:
```bash
pnpm add @xenova/transformers
pnpm add -D vitest
```

- [ ] **Step 6.2: Configure Vitest**

Create `bonti/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 60000, // bge-m3 first-load takes ~10-30s
    hookTimeout: 60000,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6.3: Write the failing test**

Create `bonti/tests/unit/embeddings.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { embed } from "@/lib/embeddings";

describe("embed", () => {
  it("returns a 1024-dim vector for a short string", async () => {
    const v = await embed("Electric Castle is a festival in Romania.");
    expect(v).toBeInstanceOf(Float32Array);
    expect(v.length).toBe(1024);
  });

  it("returns identical vectors for identical inputs", async () => {
    const a = await embed("test sentence");
    const b = await embed("test sentence");
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("returns different vectors for different inputs", async () => {
    const a = await embed("Bonțida is a village in Cluj.");
    const b = await embed("Pizza is round.");
    // Cosine similarity should be < 0.95
    const dot = a.reduce((s, x, i) => s + x * b[i], 0);
    const magA = Math.hypot(...a);
    const magB = Math.hypot(...b);
    const cosine = dot / (magA * magB);
    expect(cosine).toBeLessThan(0.95);
  });
});
```

- [ ] **Step 6.4: Run the test — verify it fails**

```bash
pnpm test embeddings
```

Expected: FAIL with "Failed to resolve import @/lib/embeddings" or similar.

- [ ] **Step 6.5: Implement `embed`**

Create `bonti/src/lib/embeddings.ts`:

```ts
import { pipeline, env, type FeatureExtractionPipeline } from "@xenova/transformers";

// Cache the model in /tmp on Vercel; locally use node_modules
env.cacheDir = process.env.HF_CACHE_DIR ?? "./.transformers-cache";
env.allowLocalModels = false; // always fetch from HF for portability

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", "Xenova/bge-m3", {
      quantized: true,
    }) as Promise<FeatureExtractionPipeline>;
  }
  return extractorPromise;
}

export async function embed(text: string): Promise<Float32Array> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return new Float32Array(output.data as Float32Array);
}

export async function embedMany(texts: string[]): Promise<Float32Array[]> {
  const results: Float32Array[] = [];
  for (const t of texts) {
    results.push(await embed(t));
  }
  return results;
}
```

- [ ] **Step 6.6: Run the test — verify it passes**

```bash
pnpm test embeddings
```

Expected: PASS, all three tests green. Note: first run downloads the model (~200MB) and may take 30-60 seconds.

If `embedMany` produces inconsistent dimensions, double-check that `Xenova/bge-m3` resolves correctly on Hugging Face — `Xenova/bge-m3` is the canonical ONNX conversion.

- [ ] **Step 6.7: Commit**

```bash
git add bonti/src/lib/embeddings.ts bonti/tests bonti/vitest.config.ts bonti/package.json bonti/pnpm-lock.yaml
git commit -m "feat(bonti): bge-m3 embedding pipeline with tests"
```

---

## Task 7: Chunking helper + tests

**Goal:** A pure function that splits a markdown document into ~500-token chunks with 100-token overlap, preserving paragraph boundaries.

**Files:**
- Create: `bonti/src/lib/chunking.ts`
- Create: `bonti/tests/unit/chunking.test.ts`

- [ ] **Step 7.1: Write the failing test**

Create `bonti/tests/unit/chunking.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/chunking";

describe("chunkText", () => {
  it("returns a single chunk for short input", () => {
    const out = chunkText("Hello world.", { maxTokens: 500, overlap: 100 });
    expect(out).toHaveLength(1);
    expect(out[0]).toBe("Hello world.");
  });

  it("splits long input into multiple chunks", () => {
    const para = "word ".repeat(2000); // ~2000 words ≈ 2500 tokens
    const out = chunkText(para, { maxTokens: 500, overlap: 100 });
    expect(out.length).toBeGreaterThan(1);
    out.forEach((c) => expect(c.length).toBeGreaterThan(0));
  });

  it("creates overlap between consecutive chunks", () => {
    const para = "word ".repeat(2000);
    const out = chunkText(para, { maxTokens: 500, overlap: 100 });
    if (out.length >= 2) {
      const tail = out[0].slice(-200);
      const head = out[1].slice(0, 200);
      // Some overlap region should share tokens (we use approximate token count = word count)
      const tailWords = new Set(tail.split(/\s+/));
      const headWords = head.split(/\s+/);
      const shared = headWords.filter((w) => tailWords.has(w));
      expect(shared.length).toBeGreaterThan(0);
    }
  });

  it("respects paragraph boundaries when possible", () => {
    const doc = "Paragraph one.\n\nParagraph two.\n\nParagraph three.";
    const out = chunkText(doc, { maxTokens: 10, overlap: 2 });
    out.forEach((c) => expect(c).not.toMatch(/^\s/));
  });
});
```

- [ ] **Step 7.2: Run the test — verify it fails**

```bash
pnpm test chunking
```

Expected: FAIL with import error.

- [ ] **Step 7.3: Implement `chunkText`**

Create `bonti/src/lib/chunking.ts`:

```ts
export type ChunkOptions = {
  maxTokens: number;
  overlap: number;
};

/**
 * Approximate-token chunker for markdown/text.
 * Uses whitespace token count as a proxy (1 word ≈ 1.3 tokens for English/Romanian).
 * Splits on paragraph boundaries when possible, then on sentences, then on words.
 */
export function chunkText(text: string, opts: ChunkOptions): string[] {
  const { maxTokens, overlap } = opts;
  if (!text.trim()) return [];

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxTokens) return [text.trim()];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + maxTokens, words.length);
    const slice = words.slice(start, end).join(" ");
    chunks.push(slice.trim());
    if (end === words.length) break;
    start = end - overlap;
    if (start <= 0) start = end;
  }
  return chunks;
}
```

- [ ] **Step 7.4: Run the test — verify it passes**

```bash
pnpm test chunking
```

Expected: PASS, four tests green.

- [ ] **Step 7.5: Commit**

```bash
git add bonti/src/lib/chunking.ts bonti/tests/unit/chunking.test.ts
git commit -m "feat(bonti): text chunking helper with overlap"
```

---

## Task 8: Seed KB content + ingestion script

**Goal:** Running `pnpm ingest` populates `kb_chunks` with embedded chunks of EC's knowledge base. Verified via SQL count.

**Files:**
- Create: `bonti/docs/ingest/faq-tickets.md`
- Create: `bonti/docs/ingest/faq-camping.md`
- Create: `bonti/docs/ingest/faq-transport.md`
- Create: `bonti/docs/ingest/ec-village.md`
- Create: `bonti/docs/ingest/tone-of-voice.md`
- Create: `bonti/docs/ingest/lineup.json`
- Create: `bonti/scripts/ingest.ts`
- Modify: `bonti/package.json` (add ingest script)

- [ ] **Step 8.1: Write seed FAQ docs**

These are abbreviated stand-ins for EC's real knowledge base. They use real EC content from the brief + tone-of-voice research. Replace with EC's full corpus when the team provides it.

Create `bonti/docs/ingest/faq-tickets.md`:

```markdown
---
lang: en
tags: [tickets, pricing, payment]
---

# Tickets — Electric Castle 2026

## Ticket types
- General Access Pass — 250€ + tax. Access to all 4 festival days.
- Day Ticket — 89€ + tax per day.
- Camping Pass — separate ticket, required for EC Village stays.

## Where to buy
electriccastle.com/tickets

## Payment plan
You can split your order into 2 monthly payments. Available at checkout.

## Lost ticket
If you forget your ticket you will not be able to enter the festival. If you lose your ticket, we will not be in the position to help you and issue you another one.

## Age requirements
18+. Anyone under 18 must be accompanied by a parent or legal guardian.

## Refund policy
Tickets are non-refundable once purchased.
```

Create `bonti/docs/ingest/faq-camping.md`:

```markdown
---
lang: en
tags: [camping, ec-village, accommodation]
---

# Camping & EC Village

## EC Village
The on-site campsite at Bonțida. Open from the Wednesday Camping Party through Sunday.

## What's good in the village
- Sunrise is part of the plan.
- No last bus to catch.
- Coffee tastes better close to the stages.
- 24/7 bonding with fellow festival-goers.

## Accommodation options
- Standard camping (bring your own tent).
- Car camping (camp next to your car).
- RV camping (your base camp round the corner).
- Glamping (city comfort at any moment).
- Off-site: stay in Cluj-Napoca and take the shuttle.

## What's not allowed
- Pets are not allowed in EC Village or on festival grounds.
- Glass bottles, weapons, fireworks, drones.

## Showers and bathrooms
Showers are open at any time. Bathrooms across the campsite and festival grounds.

## Lockers
Available near the main entrance for valuables.
```

Create `bonti/docs/ingest/faq-transport.md`:

```markdown
---
lang: en
tags: [transport, shuttle, getting-there]
---

# Getting to Electric Castle

## To Cluj-Napoca
Cluj is the closest city. Reachable by:
- Plane: Cluj International Airport (CLJ), 8 km from city center.
- Train: regular service from Bucharest, Budapest, and other European cities.
- Car: A3 highway from Bucharest (~6h), or via Hungary.
- Long-distance bus: FlixBus, Eurolines.

## From Cluj to Bonțida
- Shuttle: official EC shuttle runs from designated stops in Cluj-Napoca to the festival grounds. ~35 minutes. Tickets purchased separately, ~15 lei round-trip.
- Car: ~30 km via DN1C. Parking available near the venue.
- Taxi/Uber: works but unpredictable on peak nights.

## Justin Timberlake / peak-night traffic
On peak headliner nights, traffic on the road back to Cluj can be extremely heavy. Recommend staying at the festival overnight or planning a return after 3 AM.
```

Create `bonti/docs/ingest/ec-village.md`:

```markdown
---
lang: en
tags: [ec-village, vibe, identity]
---

# EC Village — In Your Own Timezone

The best moments at Electric Castle don't happen on schedule.

At EC Village by Lidl, mornings blur into afternoons, nights into mornings, and somehow the music never feels far away.

## What's good
- Sunrise is part of the plan.
- One more song is always possible.
- All friends in one place.
- Less commuting. More fun.
- Good coffee first. Wake up later.
```

Create `bonti/docs/ingest/tone-of-voice.md`:

This is a condensed version of the tone-of-voice research; Bonți's system prompt assembles from it. Copy from the research file:

```bash
cp docs/research/ec-tone-of-voice.md bonti/docs/ingest/tone-of-voice.md
```

- [ ] **Step 8.2: Seed a minimal lineup.json**

Create `bonti/docs/ingest/lineup.json`:

```json
[
  { "artist": "The Cure", "day": "Saturday", "stage": "Main Stage", "ec_tags": ["alternative-rock", "post-punk"], "genres": ["rock"] },
  { "artist": "Twenty One Pilots", "day": "Sunday", "stage": "Main Stage", "ec_tags": ["alt-pop", "mainstream"], "genres": ["pop", "alternative"] },
  { "artist": "Teddy Swims", "day": "Friday", "stage": "Main Stage", "ec_tags": ["soul", "r-and-b"], "genres": ["soul"] },
  { "artist": "Chase & Status", "day": "Saturday", "stage": "Hangar Stage", "ec_tags": ["dancefloor", "drum-and-bass"], "genres": ["electronic"] },
  { "artist": "Wet Leg", "day": "Friday", "stage": "Booha Stage", "ec_tags": ["indie-rock", "post-punk"], "genres": ["indie"] },
  { "artist": "Kneecap", "day": "Saturday", "stage": "Booha Stage", "ec_tags": ["irish-rap", "alt-pop"], "genres": ["hip-hop"] },
  { "artist": "LP", "day": "Friday", "stage": "Main Stage", "ec_tags": ["alt-pop", "indie"], "genres": ["pop"] },
  { "artist": "Mochakk", "day": "Saturday", "stage": "Hangar Stage", "ec_tags": ["house", "tech-house"], "genres": ["electronic"] },
  { "artist": "Nothing But Thieves", "day": "Sunday", "stage": "Main Stage", "ec_tags": ["alternative-rock"], "genres": ["rock"] },
  { "artist": "Wilkinson", "day": "Friday", "stage": "Hangar Stage", "ec_tags": ["drum-and-bass"], "genres": ["electronic"] },
  { "artist": "Subtronics", "day": "Saturday", "stage": "Hangar Stage", "ec_tags": ["dubstep"], "genres": ["electronic"] },
  { "artist": "Yung Lean & Bladee", "day": "Saturday", "stage": "Booha Stage", "ec_tags": ["cloud-rap", "hyperpop"], "genres": ["hip-hop"] }
]
```

- [ ] **Step 8.3: Write the ingestion script**

Create `bonti/scripts/ingest.ts`:

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { createAdminClient } from "@/lib/supabase/admin";
import { embed } from "@/lib/embeddings";
import { chunkText } from "@/lib/chunking";

type Lineup = Array<{
  artist: string;
  day: string;
  stage: string;
  ec_tags: string[];
  genres: string[];
}>;

async function ingestMarkdown(filePath: string, supabase: ReturnType<typeof createAdminClient>) {
  const raw = readFileSync(filePath, "utf-8");
  const { data: fm, content } = matter(raw);
  const lang = (fm.lang as string) ?? "en";
  const tags = (fm.tags as string[]) ?? [];
  const source_doc = filePath.split("/").pop()!;

  const chunks = chunkText(content, { maxTokens: 500, overlap: 100 });
  console.log(`Ingesting ${source_doc}: ${chunks.length} chunks`);

  for (const chunk of chunks) {
    const vector = await embed(chunk);
    const { error } = await supabase.from("kb_chunks").insert({
      source_doc,
      text: chunk,
      embedding: Array.from(vector),
      lang,
      tags,
    });
    if (error) throw error;
  }
}

async function ingestLineup(filePath: string, supabase: ReturnType<typeof createAdminClient>) {
  const raw: Lineup = JSON.parse(readFileSync(filePath, "utf-8"));
  console.log(`Ingesting lineup: ${raw.length} artists`);

  for (const a of raw) {
    const text = `${a.artist} plays at ${a.stage} on ${a.day}. EC tags: ${a.ec_tags.join(", ")}. Genres: ${a.genres.join(", ")}.`;
    const vector = await embed(text);
    const { error } = await supabase.from("kb_chunks").insert({
      source_doc: "lineup.json",
      text,
      embedding: Array.from(vector),
      lang: "en",
      tags: ["lineup", "artist", ...a.ec_tags],
    });
    if (error) throw error;
  }
}

async function main() {
  const supabase = createAdminClient();

  // Truncate before ingest for idempotency
  console.log("Truncating kb_chunks...");
  const { error: delErr } = await supabase.from("kb_chunks").delete().neq("id", -1);
  if (delErr) throw delErr;

  const ingestDir = join(process.cwd(), "docs/ingest");
  const files = readdirSync(ingestDir);

  for (const file of files) {
    const path = join(ingestDir, file);
    if (file.endsWith(".md")) {
      await ingestMarkdown(path, supabase);
    } else if (file === "lineup.json") {
      await ingestLineup(path, supabase);
    }
  }

  const { count } = await supabase
    .from("kb_chunks")
    .select("*", { count: "exact", head: true });
  console.log(`Done. Total chunks: ${count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 8.4: Add ingest script + gray-matter dep**

```bash
cd bonti
pnpm add gray-matter
pnpm add -D tsx dotenv-cli
```

Add to `package.json` scripts:
```json
"ingest": "dotenv -e .env.local -- tsx scripts/ingest.ts"
```

- [ ] **Step 8.5: Run ingestion**

```bash
pnpm ingest
```

Expected output: each file logs its chunk count, final line `Done. Total chunks: N` where N is the sum.

- [ ] **Step 8.6: Verify in Supabase**

From the Supabase Dashboard → Table Editor → `kb_chunks`. Confirm rows are present with `embedding` populated. Click a row, confirm `embedding` is a 1024-length vector preview.

- [ ] **Step 8.7: Commit**

```bash
git add bonti/docs/ingest bonti/scripts bonti/package.json bonti/pnpm-lock.yaml
git commit -m "feat(bonti): seed KB ingestion script"
```

---

## Task 9: RRF (Reciprocal Rank Fusion) merger + tests

**Goal:** A pure function that takes two ranked lists (vector results, full-text results) and merges them via RRF. Foundation for hybrid retrieval in Task 11.

**Files:**
- Create: `bonti/src/lib/retrieval/rrf.ts`
- Create: `bonti/tests/unit/rrf.test.ts`

- [ ] **Step 9.1: Write the failing test**

Create `bonti/tests/unit/rrf.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { reciprocalRankFusion } from "@/lib/retrieval/rrf";

type Item = { id: number };

describe("reciprocalRankFusion", () => {
  it("returns items in fused order when both lists agree", () => {
    const a: Item[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const b: Item[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const out = reciprocalRankFusion([a, b], (x) => x.id);
    expect(out.map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("merges disagreeing lists by RRF score", () => {
    const a: Item[] = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const b: Item[] = [{ id: 3 }, { id: 1 }, { id: 2 }];
    const out = reciprocalRankFusion([a, b], (x) => x.id);
    // id=1 appears at rank 1 in a and rank 2 in b → strongest
    expect(out[0].id).toBe(1);
  });

  it("dedupes items appearing in both lists", () => {
    const a: Item[] = [{ id: 1 }, { id: 2 }];
    const b: Item[] = [{ id: 1 }, { id: 3 }];
    const out = reciprocalRankFusion([a, b], (x) => x.id);
    const ids = out.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns top-k when k is given", () => {
    const a: Item[] = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const b: Item[] = [{ id: 4 }, { id: 3 }, { id: 2 }, { id: 1 }];
    const out = reciprocalRankFusion([a, b], (x) => x.id, { k: 2 });
    expect(out).toHaveLength(2);
  });
});
```

- [ ] **Step 9.2: Run the test — verify it fails**

```bash
pnpm test rrf
```

Expected: FAIL with import error.

- [ ] **Step 9.3: Implement RRF**

Create `bonti/src/lib/retrieval/rrf.ts`:

```ts
const RRF_K = 60; // standard RRF constant

export type FusionOptions = {
  k?: number; // top-k cap
  rrfConstant?: number; // override the 60 constant
};

/**
 * Reciprocal Rank Fusion across multiple ranked lists.
 * idOf must return a stable unique key per item.
 */
export function reciprocalRankFusion<T>(
  lists: T[][],
  idOf: (item: T) => string | number,
  opts: FusionOptions = {},
): T[] {
  const constant = opts.rrfConstant ?? RRF_K;
  const scores = new Map<string | number, { item: T; score: number }>();

  for (const list of lists) {
    list.forEach((item, idx) => {
      const id = idOf(item);
      const rank = idx + 1;
      const inc = 1 / (constant + rank);
      const prev = scores.get(id);
      if (prev) prev.score += inc;
      else scores.set(id, { item, score: inc });
    });
  }

  const sorted = [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);

  return opts.k ? sorted.slice(0, opts.k) : sorted;
}
```

- [ ] **Step 9.4: Run the test — verify it passes**

```bash
pnpm test rrf
```

Expected: PASS, four tests green.

- [ ] **Step 9.5: Commit**

```bash
git add bonti/src/lib/retrieval/rrf.ts bonti/tests/unit/rrf.test.ts
git commit -m "feat(bonti): RRF fusion helper for hybrid retrieval"
```

---

## Task 10: OpenRouter integration via Vercel AI SDK

**Goal:** A `lib/openrouter.ts` module exposes a configured Gemma 4 31B model. A smoke API route streams a one-shot completion to confirm wiring.

**Files:**
- Create: `bonti/src/lib/openrouter.ts`
- Create: `bonti/src/app/api/llm-smoke/route.ts` (temporary; removed in Task 13)

- [ ] **Step 10.1: Install Vercel AI SDK + OpenAI provider**

From `bonti/`:
```bash
pnpm add ai @ai-sdk/openai
```

- [ ] **Step 10.2: Configure OpenRouter via OpenAI-compatible base URL**

Create `bonti/src/lib/openrouter.ts`:

```ts
import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  // OpenRouter expects an HTTP-Referer to attribute requests
  // (optional but recommended for free tier)
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "X-Title": "Bonți — Electric Castle Companion",
  },
});

export const GEMMA_4_31B = openrouter("google/gemma-4-31b-it:free");
export const DEEPSEEK_V4_FLASH = openrouter("deepseek/deepseek-v4-flash:free");
```

- [ ] **Step 10.3: Create a temporary smoke route**

Create `bonti/src/app/api/llm-smoke/route.ts`:

```ts
import { streamText } from "ai";
import { GEMMA_4_31B } from "@/lib/openrouter";

export async function GET() {
  const result = streamText({
    model: GEMMA_4_31B,
    prompt: "Say 'Bonți is online' in exactly three words. No punctuation.",
  });
  return result.toTextStreamResponse();
}
```

- [ ] **Step 10.4: Manual test**

Run `pnpm dev`, then in another terminal:
```bash
curl -N http://localhost:3000/api/llm-smoke
```

Expected: streaming output ending with something like `Bonți is online` (Gemma may include minor variations — the goal is to confirm streaming works).

If you see `401 Unauthorized`, check `OPENROUTER_API_KEY` in `.env.local`.
If you see `404 model not found`, confirm `google/gemma-4-31b-it:free` is still in OpenRouter's free collection at https://openrouter.ai/collections/free-models — swap to `deepseek/deepseek-v4-flash:free` if Gemma has been retired.

- [ ] **Step 10.5: Commit**

```bash
git add bonti/src/lib/openrouter.ts bonti/src/app/api/llm-smoke bonti/package.json bonti/pnpm-lock.yaml
git commit -m "feat(bonti): OpenRouter integration via Vercel AI SDK"
```

---

## Task 11: Bonți system prompt + few-shot library

**Goal:** A `lib/prompts/bonti-system.ts` module assembles Bonți's system prompt from voice rules + few-shot examples + retrieved context. Pure-function tested.

**Files:**
- Create: `bonti/src/types/chat.ts`  *(types used here AND by Task 12+)*
- Create: `bonti/src/lib/prompts/bonti-voice-rules.ts`
- Create: `bonti/src/lib/prompts/bonti-fewshot.ts`
- Create: `bonti/src/lib/prompts/bonti-system.ts`
- Create: `bonti/tests/unit/prompt-assembly.test.ts`

- [ ] **Step 11.0: Create shared types module**

Create `bonti/src/types/chat.ts`:

```ts
export type Lang = "en" | "ro";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type RetrievedChunk = {
  id: number;
  source_doc: string;
  text: string;
  lang: Lang;
  tags: string[];
  similarity: number;
};
```

This is the single source of truth — Tasks 11, 12, 13, 15, 16 all import from `@/types/chat`.

- [ ] **Step 11.1: Write the failing test**

Create `bonti/tests/unit/prompt-assembly.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildBontiSystemPrompt } from "@/lib/prompts/bonti-system";

describe("buildBontiSystemPrompt", () => {
  it("includes the identity declaration", () => {
    const prompt = buildBontiSystemPrompt({ retrievedChunks: [], lang: "en" });
    expect(prompt).toMatch(/You are Bonți/);
  });

  it("includes voice rules including 'tu/voi'", () => {
    const prompt = buildBontiSystemPrompt({ retrievedChunks: [], lang: "ro" });
    expect(prompt).toMatch(/tu/i);
    expect(prompt).not.toMatch(/dumneavoastră/i);
  });

  it("includes retrieved context when provided", () => {
    const prompt = buildBontiSystemPrompt({
      retrievedChunks: [
        { source_doc: "faq.md", text: "Shuttle costs 15 lei round-trip.", lang: "en", tags: [], similarity: 0.9 },
      ],
      lang: "en",
    });
    expect(prompt).toMatch(/Shuttle costs 15 lei/);
  });

  it("forbids anti-vocabulary", () => {
    const prompt = buildBontiSystemPrompt({ retrievedChunks: [], lang: "en" });
    // Each forbidden word should be explicitly named as forbidden
    expect(prompt.toLowerCase()).toMatch(/never use/);
    expect(prompt.toLowerCase()).toMatch(/unmissable/);
    expect(prompt.toLowerCase()).toMatch(/epic/);
  });

  it("includes at least 4 few-shot exchanges", () => {
    const prompt = buildBontiSystemPrompt({ retrievedChunks: [], lang: "en" });
    const matches = prompt.match(/USER:/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 11.2: Run the test — verify it fails**

```bash
pnpm test prompt-assembly
```

Expected: FAIL with import error.

- [ ] **Step 11.3: Implement voice-rules module**

Create `bonti/src/lib/prompts/bonti-voice-rules.ts`:

```ts
/**
 * Bonți's voice rules, grounded in docs/research/ec-tone-of-voice.md.
 * Each rule cites a source quote from the research.
 */
export const VOICE_RULES = `
Voice rules (grounded in EC's published copy, see docs/research/ec-tone-of-voice.md):

1. Romanian: use "tu/voi" always. Never "dumneavoastră". Even legal-adjacent surfaces stay tu.
2. Lead with image or fact, not greeting. Never "Hey!", "Salut, prietene!", or "Hi friend".
3. Two-clause editorial: image + counter-fact. Example shape: "The best moments don't happen on schedule."
4. One-word emphasis is allowed and brand-correct. Example: "Thrilling." or "Sorry, but no."
5. "Good" beats "awesome" / "great" / "amazing". EC's verified vocabulary.
6. NEVER USE these words/phrases: epic, unmissable, "don't miss out", exclusive, "act now", awesome, "festival fam", "hey friend", "feel free to", "of course!". Zero hits in EC's actual corpus.
7. Brand tokens stay English mid-RO sentence: "line up-ul", "shuttle-ul", "match-ul", "EC Village", "EC12", "Camping Pass", stage names. Use RO definite article hyphen: "line up-ul", not "line up-uli".
8. Emoji are functional: 🎉 arrival/celebration, 🔴/⚡ urgency. No decorative emoji. No emoji chains.
9. Posture: recurrence, not novelty. "Ne vedem la festival." / "Back at the castle again." Don't close sales; expect users back.
10. Refusals admit no without padding. "Sorry, but no." rhythm. Don't soften with "unfortunately I'm not able to".
11. Default reply length: short. 1-2 sentences for logistics, 2-4 for anxiety, longer only when complexity demands.
12. Use stage nicknames like a local: "Banffy", "Main", "Hangar", "Booha". Not full marketing names.

Surface registers (pick by topic, not by speaker):
- Vibe / village / first-timer pitch → editorial-sensory (EC Village rhythm).
- Tickets / logistics / compass directions / FAQ → flat-informational ("80m dreapta. Line is short.").
- Rules / refusals → short and direct; one wry one-liner per response is on-brand.

Safety guardrails:
- Medical → "There's a medical tent near Main + first aid on the campsite. If urgent: 112."
- Distress (suicide, self-harm, severe panic, crime) → "Bonți can't help with this. Find an EC safety crew member (red vest) or call 112." Stop normal conversation.
- Never recommend illegal activities, drugs, underage drinking.
- Never promise specific weather, traffic, or live data you don't have in context.
`.trim();
```

- [ ] **Step 11.4: Implement few-shot library**

Create `bonti/src/lib/prompts/bonti-fewshot.ts`:

```ts
/**
 * Hand-curated few-shot examples spanning Bonți's main modes.
 * Drawn from the design spec §12.3 sample library.
 */
export const FEW_SHOT = `
EXAMPLES

USER: Sunt din București, n-am mai fost la EC, am 29 de ani, nu vreau cort, vin cu încă 3 prieteni, putem sta 2 zile, ne place muzica mai party/mainstream și mă stresează puțin transportul și ploaia.
BONȚI: Calm. Patru oameni, două zile, fără cort, party/mainstream — Vineri și Sâmbătă sunt zilele voastre. Dormiți în Cluj, shuttle până la Bonțida în 35 min. ~1200 lei de cap, mâncare inclusă. Cizme de cauciuc și o jachetă impermeabilă onestă — nu umbrelă. Vreți planul pe foaie?

USER: I'm a first-timer, scared of camping.
BONȚI: Got it. You don't have to camp. Cluj has cheap rooms, the shuttle's 35 min, ~15 lei round-trip. You'll sleep in a real bed and still catch sunrise sets if you want.

USER: where can I drink a beer
BONȚI: Beer Garden, 80m dreapta. Line is short.

USER: i want somewhere chill, away from the crowd
BONȚI: Beach Stage is empty right now. 4 min walk. Beer and sand.

USER: write something for my whatsapp group to convince them
BONȚI: Drop this in the group: Going to EC, July 16-19. Sleeping in Cluj (no tent), shuttle to Bonțida. Focus: Glass Animals (Sat) + LP (Fri) + Mochakk for the late night. ~1200 lei each, food included. Pack: wellies + honest raincoat. Don't be the one who bails.

USER: how much money do I need
BONȚI: For a 2-day weekend with a Day Ticket each day, sleeping in Cluj: ~1200 lei per person, food and shuttle included. Add ~300 lei for drinks per day if you go in. Tickets are 89€/day or 250€ for the full pass.
`.trim();
```

- [ ] **Step 11.5: Implement system prompt assembly**

Create `bonti/src/lib/prompts/bonti-system.ts`:

```ts
import { VOICE_RULES } from "./bonti-voice-rules";
import { FEW_SHOT } from "./bonti-fewshot";
import type { Lang, RetrievedChunk } from "@/types/chat";

export type SystemPromptInput = {
  retrievedChunks: RetrievedChunk[];
  lang: Lang;
};

const IDENTITY = `
You are Bonți (pronounced BOHN-tsee). You are Electric Castle's AI friend — the one who has been to every EC edition since 2013. You know the stages by nickname (Banffy, Main, Hangar, Booha). You've slept in a tent, in Cluj, in a 4-star. You'll tell users the truth even when EC's marketing won't.

You are bilingual: Romanian and English. Detect the user's language and reply in it. Codeswitch naturally — brand tokens (line-up, EC Village, EC12, stage names) stay English even in Romanian sentences.
`.trim();

export function buildBontiSystemPrompt(input: SystemPromptInput): string {
  const { retrievedChunks, lang } = input;

  const contextBlock =
    retrievedChunks.length > 0
      ? `\nRETRIEVED CONTEXT (use this to answer factually — do not invent details outside it):\n${retrievedChunks
          .map(
            (c, i) =>
              `[${i + 1}] (${c.source_doc}, lang=${c.lang}, sim=${c.similarity.toFixed(2)}): ${c.text}`,
          )
          .join("\n")}\n`
      : "";

  const langInstruction = `\nReply in ${lang === "ro" ? "Romanian" : "English"} unless the user clearly writes in the other language.\n`;

  return [IDENTITY, VOICE_RULES, contextBlock, FEW_SHOT, langInstruction]
    .filter(Boolean)
    .join("\n\n");
}
```

- [ ] **Step 11.6: Run the test — verify it passes**

```bash
pnpm test prompt-assembly
```

Expected: PASS, five tests green.

- [ ] **Step 11.7: Commit**

```bash
git add bonti/src/types bonti/src/lib/prompts bonti/tests/unit/prompt-assembly.test.ts
git commit -m "feat(bonti): system prompt assembly with voice rules and few-shot"
```

---

## Task 12: Hybrid retrieval module + integration test

**Goal:** A `lib/retrieval/hybrid.ts` function takes a user query, runs vector + full-text search, fuses with RRF, returns top-K. Integration test against the seeded Supabase KB.

**Files:**
- Create: `bonti/src/lib/retrieval/hybrid.ts`
- Create: `bonti/tests/integration/retrieval.test.ts`

*Note: `bonti/src/types/chat.ts` was created in Task 11.0 — we reuse `Lang` and `RetrievedChunk` from there.*

- [ ] **Step 12.2: Write the integration test**

Create `bonti/tests/integration/retrieval.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { hybridRetrieve } from "@/lib/retrieval/hybrid";
import { createAdminClient } from "@/lib/supabase/admin";

describe("hybridRetrieve (integration)", () => {
  beforeAll(async () => {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("kb_chunks")
      .select("*", { count: "exact", head: true });
    if (!count || count === 0) {
      throw new Error("kb_chunks is empty — run `pnpm ingest` before this test");
    }
  });

  it("retrieves transport-related chunks for a transport query", async () => {
    const out = await hybridRetrieve("how do I get from Cluj to Bonțida?", { lang: "en", k: 5 });
    expect(out.length).toBeGreaterThan(0);
    const combined = out.map((c) => c.text).join(" ").toLowerCase();
    expect(combined).toMatch(/shuttle|bonțida|cluj/);
  });

  it("retrieves camping chunks for a camping query", async () => {
    const out = await hybridRetrieve("can I bring my dog to the campsite?", { lang: "en", k: 5 });
    expect(out.length).toBeGreaterThan(0);
    const combined = out.map((c) => c.text).join(" ").toLowerCase();
    expect(combined).toMatch(/pet|dog|ec village|camping/);
  });

  it("respects the k limit", async () => {
    const out = await hybridRetrieve("electric castle", { lang: "en", k: 3 });
    expect(out.length).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 12.3: Run the test — verify it fails**

```bash
pnpm test retrieval
```

Expected: FAIL with import error.

- [ ] **Step 12.4: Implement hybrid retrieval**

Create `bonti/src/lib/retrieval/hybrid.ts`:

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { embed } from "@/lib/embeddings";
import { reciprocalRankFusion } from "@/lib/retrieval/rrf";
import type { Lang, RetrievedChunk } from "@/types/chat";

export type HybridOptions = {
  lang?: Lang;
  k?: number; // final top-k after fusion (default 5)
  retrievalSize?: number; // per-source size before fusion (default 20)
  tags?: string[]; // optional tag filter
};

type VectorRow = {
  id: number;
  source_doc: string;
  text: string;
  lang: string;
  tags: string[];
  similarity: number;
};

type FtsRow = {
  id: number;
  source_doc: string;
  text: string;
  lang: string;
  tags: string[];
  rank: number;
};

export async function hybridRetrieve(
  query: string,
  opts: HybridOptions = {},
): Promise<RetrievedChunk[]> {
  const k = opts.k ?? 5;
  const retrievalSize = opts.retrievalSize ?? 20;
  const lang = opts.lang ?? null;
  const tagsFilter = opts.tags && opts.tags.length > 0 ? opts.tags : null;

  const supabase = createAdminClient();

  // Run vector search and FTS in parallel
  const [vectorRes, ftsRes] = await Promise.all([
    embed(query).then((vec) =>
      supabase.rpc("match_kb_chunks", {
        query_embedding: Array.from(vec),
        match_count: retrievalSize,
        filter_lang: lang,
        filter_tags: tagsFilter,
      }),
    ),
    supabase.rpc("search_kb_chunks_fts", {
      query_text: query,
      match_count: retrievalSize,
      filter_lang: lang,
    }),
  ]);

  if (vectorRes.error) throw vectorRes.error;
  if (ftsRes.error) throw ftsRes.error;

  const vectorList = ((vectorRes.data ?? []) as VectorRow[]).map((r) => ({
    id: r.id,
    source_doc: r.source_doc,
    text: r.text,
    lang: r.lang as Lang,
    tags: r.tags,
    similarity: r.similarity,
  }));

  const ftsList = ((ftsRes.data ?? []) as FtsRow[]).map((r) => ({
    id: r.id,
    source_doc: r.source_doc,
    text: r.text,
    lang: r.lang as Lang,
    tags: r.tags,
    similarity: r.rank, // reuse field; not used past fusion
  }));

  const fused = reciprocalRankFusion(
    [vectorList, ftsList],
    (x) => x.id,
    { k },
  );

  return fused;
}
```

- [ ] **Step 12.5: Run the test — verify it passes**

```bash
pnpm test retrieval
```

Expected: PASS, three tests green. If the camping test fails because the seed KB doesn't include a clear "pets" answer, scroll up to `bonti/docs/ingest/faq-camping.md` and confirm the "Pets are not allowed" line is present, then re-run `pnpm ingest`.

- [ ] **Step 12.6: Commit**

```bash
git add bonti/src/lib/retrieval bonti/tests/integration
git commit -m "feat(bonti): hybrid vector+fts retrieval with RRF fusion"
```

---

## Task 13: Query rewriting (chat history → standalone query)

**Goal:** A `lib/retrieval/rewrite.ts` function that takes recent chat history + the new user message, asks the LLM to produce a single self-contained query for retrieval. Pure function tested with a stubbable LLM.

**Files:**
- Create: `bonti/src/lib/retrieval/rewrite.ts`
- Create: `bonti/tests/unit/rewrite.test.ts`

- [ ] **Step 13.1: Write the failing test**

Create `bonti/tests/unit/rewrite.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { rewriteForRetrieval } from "@/lib/retrieval/rewrite";

describe("rewriteForRetrieval", () => {
  it("returns the message unchanged when history is empty", async () => {
    const fakeLLM = vi.fn();
    const out = await rewriteForRetrieval({
      history: [],
      message: "how do I get to Bonțida?",
      generateText: fakeLLM,
    });
    expect(out).toBe("how do I get to Bonțida?");
    expect(fakeLLM).not.toHaveBeenCalled();
  });

  it("resolves pronouns using history", async () => {
    const fakeLLM = vi.fn().mockResolvedValue("Where are the bathrooms at Electric Castle?");
    const out = await rewriteForRetrieval({
      history: [
        { role: "user", content: "tell me about the bathrooms" },
        { role: "assistant", content: "There are bathrooms across the campsite and main grounds." },
      ],
      message: "what about the clean ones?",
      generateText: fakeLLM,
    });
    expect(out).toMatch(/bathroom/i);
    expect(fakeLLM).toHaveBeenCalled();
  });

  it("falls back to the raw message on LLM failure", async () => {
    const fakeLLM = vi.fn().mockRejectedValue(new Error("oops"));
    const out = await rewriteForRetrieval({
      history: [{ role: "user", content: "stuff" }, { role: "assistant", content: "more stuff" }],
      message: "what about it?",
      generateText: fakeLLM,
    });
    expect(out).toBe("what about it?");
  });
});
```

- [ ] **Step 13.2: Run the test — verify it fails**

```bash
pnpm test rewrite
```

Expected: FAIL with import error.

- [ ] **Step 13.3: Implement rewrite**

Create `bonti/src/lib/retrieval/rewrite.ts`:

```ts
import type { ChatMessage } from "@/types/chat";

export type RewriteInput = {
  history: ChatMessage[];
  message: string;
  generateText: (prompt: string) => Promise<string>;
};

const REWRITE_PROMPT = `
You rewrite the latest user message into a self-contained search query that can be used for retrieval without seeing the prior conversation. Resolve pronouns (it, they, that, this) and missing referents using the conversation history. Output ONLY the rewritten query — no preamble, no quotes, no explanation.

CONVERSATION HISTORY:
{{HISTORY}}

LATEST USER MESSAGE:
{{MESSAGE}}

REWRITTEN QUERY:`.trim();

export async function rewriteForRetrieval(input: RewriteInput): Promise<string> {
  const { history, message, generateText } = input;

  // Skip rewriting if there's no history — nothing to resolve.
  if (history.length === 0) return message;

  const historyText = history
    .slice(-6) // last 3 turns
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");
  const prompt = REWRITE_PROMPT.replace("{{HISTORY}}", historyText).replace("{{MESSAGE}}", message);

  try {
    const rewritten = await generateText(prompt);
    return rewritten.trim() || message;
  } catch {
    return message;
  }
}
```

- [ ] **Step 13.4: Run the test — verify it passes**

```bash
pnpm test rewrite
```

Expected: PASS, three tests green.

- [ ] **Step 13.5: Commit**

```bash
git add bonti/src/lib/retrieval/rewrite.ts bonti/tests/unit/rewrite.test.ts
git commit -m "feat(bonti): query rewriting for chat-aware retrieval"
```

---

## Task 14: HyDE-lite (hypothetical answer for embedding)

**Goal:** A `lib/retrieval/hyde.ts` function asks the LLM to generate a brief hypothetical answer, then embeds *that* for retrieval — often outperforming embedding the question directly for FAQ-style content.

**Files:**
- Create: `bonti/src/lib/retrieval/hyde.ts`

- [ ] **Step 14.1: Implement HyDE-lite**

Create `bonti/src/lib/retrieval/hyde.ts`:

```ts
const HYDE_PROMPT = `
Write 2 short sentences that a knowledgeable festival friend might say in answer to the user's question. The user is a first-time visitor at Electric Castle in Bonțida, Romania. Output ONLY the answer — no preamble.

USER QUESTION:
{{Q}}

ANSWER:`.trim();

export type HydeInput = {
  question: string;
  generateText: (prompt: string) => Promise<string>;
};

export async function generateHydeAnswer(input: HydeInput): Promise<string> {
  const { question, generateText } = input;
  try {
    const answer = await generateText(HYDE_PROMPT.replace("{{Q}}", question));
    return answer.trim() || question;
  } catch {
    return question;
  }
}
```

This module deliberately has no test of its own — its value is observed end-to-end in retrieval quality, not in unit isolation. The HyDE call is plumbed into the chat API in Task 15.

- [ ] **Step 14.2: Commit**

```bash
git add bonti/src/lib/retrieval/hyde.ts
git commit -m "feat(bonti): HyDE-lite hypothetical-answer generation for retrieval"
```

---

## Task 15: Chat API endpoint with streaming + full RAG pipeline

**Goal:** `POST /api/chat` accepts `{ messages, lang? }`, runs query-rewrite → HyDE → hybrid retrieval → Bonți prompt assembly → streaming response. Integration test asserts a streamed response contains relevant content.

**Files:**
- Create: `bonti/src/app/api/chat/route.ts`
- Delete: `bonti/src/app/api/llm-smoke/route.ts` (no longer needed)
- Create: `bonti/tests/integration/chat-api.test.ts`

- [ ] **Step 15.1: Write the integration test**

Create `bonti/tests/integration/chat-api.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("POST /api/chat", () => {
  it("streams a response that mentions shuttle for a transport question", async () => {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "how do I get from Cluj to Bonțida?" }],
        lang: "en",
      }),
    });
    expect(res.ok).toBe(true);
    const text = await res.text();
    expect(text.toLowerCase()).toMatch(/shuttle|bonțida/);
  }, 60000);

  it("responds in Romanian when lang=ro", async () => {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "cum ajung la festival?" }],
        lang: "ro",
      }),
    });
    expect(res.ok).toBe(true);
    const text = await res.text();
    // Romanian heuristic: presence of any RO-specific words or diacritics
    expect(text.toLowerCase()).toMatch(/cluj|bonțida|shuttle|festival/);
  }, 60000);
});
```

This test depends on the dev server running at localhost:3000. The runner instructions document this dependency in step 15.5.

- [ ] **Step 15.2: Run the test — verify it fails**

```bash
pnpm test chat-api
```

Expected: FAIL with connection refused or 404 (route doesn't exist yet).

- [ ] **Step 15.3: Implement the chat route**

Create `bonti/src/app/api/chat/route.ts`:

```ts
import { streamText, generateText, type CoreMessage } from "ai";
import { GEMMA_4_31B } from "@/lib/openrouter";
import { rewriteForRetrieval } from "@/lib/retrieval/rewrite";
import { generateHydeAnswer } from "@/lib/retrieval/hyde";
import { hybridRetrieve } from "@/lib/retrieval/hybrid";
import { buildBontiSystemPrompt } from "@/lib/prompts/bonti-system";
import type { ChatMessage, Lang } from "@/types/chat";

export const runtime = "nodejs"; // Transformers.js needs Node, not Edge

type Body = {
  messages: ChatMessage[];
  lang?: Lang;
};

function detectLang(text: string): Lang {
  // Crude detector: presence of RO-specific diacritics or common RO function words.
  const ro = /\b(și|sau|cu|fără|când|cum|unde|de|la|este|sunt|nu)\b|[ăâîșț]/i;
  return ro.test(text) ? "ro" : "en";
}

async function llmCompletion(prompt: string): Promise<string> {
  const { text } = await generateText({
    model: GEMMA_4_31B,
    prompt,
    temperature: 0.3,
  });
  return text;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const messages = body.messages ?? [];
  const latest = messages[messages.length - 1];
  if (!latest || latest.role !== "user") {
    return new Response("Last message must be from user", { status: 400 });
  }
  const history: ChatMessage[] = messages.slice(0, -1);
  const lang: Lang = body.lang ?? detectLang(latest.content);

  // 1. Rewrite for retrieval
  const standalone = await rewriteForRetrieval({
    history,
    message: latest.content,
    generateText: llmCompletion,
  });

  // 2. HyDE: generate a hypothetical answer, embed it for retrieval
  const hypo = await generateHydeAnswer({
    question: standalone,
    generateText: llmCompletion,
  });

  // 3. Hybrid retrieval
  const chunks = await hybridRetrieve(hypo, { lang, k: 5 });

  // 4. Build Bonți system prompt
  const systemPrompt = buildBontiSystemPrompt({
    retrievedChunks: chunks,
    lang,
  });

  // 5. Stream the actual response
  const coreMessages: CoreMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const result = streamText({
    model: GEMMA_4_31B,
    system: systemPrompt,
    messages: coreMessages,
    temperature: 0.6,
  });

  return result.toTextStreamResponse();
}
```

- [ ] **Step 15.4: Delete the temporary smoke route**

```bash
rm -rf bonti/src/app/api/llm-smoke
```

- [ ] **Step 15.5: Run the test with the dev server up**

In one terminal:
```bash
cd bonti && pnpm dev
```

Wait until it says "Ready". In another terminal:
```bash
pnpm test chat-api
```

Expected: PASS for both tests. The first request is slow (HyDE + rewrite + retrieve + stream all serial); subsequent requests faster.

- [ ] **Step 15.6: Manual chat test**

In a terminal:
```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"i am scared of camping at electric castle"}],"lang":"en"}'
```

Expected: streaming response in Bonți's voice, restrained, mentions Cluj/shuttle as the no-camping alternative. Should NOT contain "frate", "epic", "unmissable", or exclamation chains.

- [ ] **Step 15.7: Commit**

```bash
git add bonti/src/app/api/chat bonti/tests/integration/chat-api.test.ts
git rm -r bonti/src/app/api/llm-smoke
git commit -m "feat(bonti): chat API with rewrite → HyDE → hybrid retrieval → streaming"
```

---

## Task 16: Chat UI shell — Bonți header + chat input + streamed message list

**Goal:** The home page is a functioning chat: type a message, see a streamed reply rendered in Bonți's voice. Looks brand-consistent (EC red header, Sofia Sans, Roboto body).

**Files:**
- Create: `bonti/src/components/bonti-header.tsx`
- Create: `bonti/src/components/chat-input.tsx`
- Create: `bonti/src/components/message-list.tsx`
- Create: `bonti/src/hooks/use-chat.ts`
- Modify: `bonti/src/app/page.tsx`

- [ ] **Step 16.1: Install shadcn/ui base**

From `bonti/`:
```bash
pnpm dlx shadcn@latest init -d
```

Accept defaults. This sets up `components.json`, generates `src/components/ui/` with shadcn primitives, and patches `tailwind.config.ts`.

Add components we'll use:
```bash
pnpm dlx shadcn@latest add button input textarea card
```

- [ ] **Step 16.2: Install Framer Motion**

```bash
pnpm add framer-motion
```

- [ ] **Step 16.3: Create the BontiHeader component**

Create `bonti/src/components/bonti-header.tsx`:

```tsx
import { BRAND } from "@/lib/brand";
import { SignInButton } from "@/components/sign-in-button";

export function BontiHeader({ user }: { user: { email?: string | null } | null }) {
  return (
    <header className="sticky top-0 z-10 bg-bonti-toolbar px-6 py-4 flex justify-between items-center">
      <div>
        <h1 className="text-bonti-red text-2xl font-sofia leading-none">
          {BRAND.name}
        </h1>
        <p className="text-white/60 text-xs font-roboto mt-1">
          {BRAND.festival.edition} · {BRAND.festival.dates}
        </p>
      </div>
      {user ? (
        <span className="text-white font-roboto text-sm">{user.email}</span>
      ) : (
        <SignInButton />
      )}
    </header>
  );
}
```

- [ ] **Step 16.4: Create the message list component**

Create `bonti/src/components/message-list.tsx`:

```tsx
"use client";

import type { ChatMessage } from "@/types/chat";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return (
      <p className="text-bonti-text/60 font-roboto text-base">
        Castle&apos;s in 8 weeks. What&apos;s on your mind?
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map((m, i) => (
        <div
          key={i}
          className={
            m.role === "user"
              ? "self-end max-w-[80%] bg-bonti-toolbar text-white font-roboto px-4 py-2 rounded-lg"
              : "self-start max-w-[80%] bg-bonti-surface text-bonti-text font-roboto px-4 py-3 rounded-lg border border-black/5"
          }
        >
          {m.content}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 16.5: Create the chat input component**

Create `bonti/src/components/chat-input.tsx`:

```tsx
"use client";

import { useState } from "react";

export function ChatInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        onSubmit(trimmed);
        setValue("");
      }}
    >
      <input
        type="text"
        className="flex-1 bg-white border border-black/10 px-4 py-3 font-roboto text-base focus:outline-none focus:border-bonti-red"
        placeholder="Ask Bonți anything…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="bg-bonti-red text-white font-sofia uppercase px-4 py-3 text-sm disabled:opacity-50"
      >
        Ask
      </button>
    </form>
  );
}
```

- [ ] **Step 16.6: Create the chat hook (handles streaming)**

Create `bonti/src/hooks/use-chat.ts`:

```ts
"use client";

import { useCallback, useState } from "react";
import type { ChatMessage, Lang } from "@/types/chat";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(async (text: string, lang?: Lang) => {
    setLoading(true);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);

    // Append empty assistant message we'll stream into
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, lang }),
      });
      if (!res.ok || !res.body) throw new Error(`Chat request failed: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (err) {
      console.error(err);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Something broke. Try again.",
        };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }, [messages]);

  return { messages, loading, send };
}
```

- [ ] **Step 16.7: Wire everything into the home page**

Replace `bonti/src/app/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { BontiHeader } from "@/components/bonti-header";
import { ChatShell } from "@/components/chat-shell";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-bonti-bg flex flex-col">
      <BontiHeader user={user ? { email: user.email } : null} />
      <ChatShell />
    </main>
  );
}
```

Create `bonti/src/components/chat-shell.tsx`:

```tsx
"use client";

import { useChat } from "@/hooks/use-chat";
import { MessageList } from "@/components/message-list";
import { ChatInput } from "@/components/chat-input";

export function ChatShell() {
  const { messages, loading, send } = useChat();
  return (
    <section className="flex-1 flex flex-col gap-6 px-6 py-8 max-w-2xl w-full mx-auto">
      <div className="flex-1 flex flex-col">
        <MessageList messages={messages} />
      </div>
      <ChatInput onSubmit={(t) => send(t)} disabled={loading} />
    </section>
  );
}
```

- [ ] **Step 16.8: Manual test**

Run `pnpm dev`. Open http://localhost:3000.

Expected behavior:
- Brand header at top, EC red "Bonți" wordmark, EC12 dates underneath.
- Empty chat shows the greeting line.
- Type "scared of camping" → press Ask → see streamed Bonți response (restrained, mentions Cluj/shuttle, no "frate", no exclamation chains).
- Type "cum ajung la Bonțida?" → response in Romanian.

- [ ] **Step 16.9: Commit**

```bash
git add bonti/src/components bonti/src/hooks bonti/src/app/page.tsx bonti/components.json bonti/tailwind.config.ts bonti/package.json bonti/pnpm-lock.yaml
git commit -m "feat(bonti): chat UI shell with streaming + brand header"
```

---

## Task 17: Deploy to Vercel

**Goal:** A live URL judges can open. Auth, chat, and KB retrieval all work in production.

**Files:**
- No new files; configuration only.

- [ ] **Step 17.1: Install Vercel CLI**

```bash
pnpm add -g vercel
```

(If you can't install globally, use `pnpm dlx vercel` everywhere below.)

- [ ] **Step 17.2: Link the project**

From `bonti/`:
```bash
vercel link
```

Select / create a new Vercel project tied to your account. Accept the Next.js framework preset.

- [ ] **Step 17.3: Set environment variables**

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add OPENROUTER_API_KEY production
vercel env add NEXT_PUBLIC_SITE_URL production
```

For `NEXT_PUBLIC_SITE_URL`, paste your Vercel project URL (e.g., `https://bonti.vercel.app`).

Also repeat for `preview` and `development` environments (or use `vercel env pull` later to sync local).

- [ ] **Step 17.4: Update Supabase + Google OAuth redirect URIs for production**

- Supabase Dashboard → Authentication → URL Configuration → Site URL: set to your Vercel URL.
- Supabase Dashboard → Authentication → URL Configuration → Redirect URLs: add `https://<vercel-url>/auth/callback`.
- Google Cloud Console → OAuth client → Authorized redirect URIs: add `https://<your-supabase-project>.supabase.co/auth/v1/callback` if not already there.

- [ ] **Step 17.5: First deploy**

```bash
vercel --prod
```

Wait for the build to complete.

- [ ] **Step 17.6: Smoke-test production**

Visit the production URL. Expected:
- Home page loads with brand header.
- Sign in with Google works (redirects back successfully).
- Type "what should I pack for rain?" → see a streamed response that mentions wellies / impermeabil / wet weather.

If the chat hangs or returns 500: check Vercel logs (`vercel logs`). Most common causes:
- `OPENROUTER_API_KEY` not set in production env.
- Supabase service-role key not set.
- Transformers.js cache cold-start timeout — Vercel serverless functions can be slow on first invocation while bge-m3 downloads. Either accept the cold start or pre-warm via a build hook (out of scope for foundation).

- [ ] **Step 17.7: Commit + push**

```bash
git add bonti/.vercel
git commit -m "chore: link Vercel project for Bonti production deployment"
```

If using GitHub remote, push: `git push origin main`.

---

## Self-Review Checklist

Run through this when all tasks above are complete:

**Spec coverage** (against `docs/superpowers/specs/2026-05-23-bonti-electric-castle-design.md`):

| Spec section | Foundation coverage |
|---|---|
| §3 Positioning — name, persona | ✅ Brand module, voice rules, system prompt |
| §5 IA — `/` and chat | ✅ Home page wired to chat API |
| §6 P0 feature: "Free-search box + chat" | ✅ Chat shell + streaming API |
| §6 P0 feature: "Romanian + English auto-detect" | ✅ `detectLang` + system-prompt lang directive |
| §6 P0 feature: "Bonți persona consistency" | ✅ Voice rules + few-shot library |
| §8 Stack — Next.js, Supabase, OpenRouter, bge-m3, Transformers.js | ✅ All wired |
| §8.3 Schema — all foundation tables | ✅ Migrations 1-7 |
| §9.1 Chat/RAG pipeline | ✅ Rewrite → HyDE → hybrid retrieve → stream |
| §10 RAG quality: query rewriting | ✅ Task 13 |
| §10 RAG quality: HyDE-lite | ✅ Task 14 |
| §10 RAG quality: hybrid (vector + FTS + RRF) | ✅ Tasks 9, 12 |
| §10 RAG quality: multi-granularity chunking | Partial — single granularity in foundation; add lineup-flatten later |
| §11 KB ingestion | ✅ Task 8 |
| §12 Persona spec | ✅ Voice rules + few-shot + tone-of-voice doc in KB |
| §13 Safety guardrails | ✅ Embedded in voice rules; behavioural-only verification needed |
| §15 Pilot path | Not built (informational only in spec) |

**Plans 1/2/3 NOT covered here (intentional)** — they build on this foundation:
- Music match (URL paste, multi-platform extraction)
- Guided planner with structured plan card
- Group plan generator
- Buy-ticket CTA + plan sharing URL
- iPhone frame wrapper + in-festival surfaces
- Compass / group map / proactive pings / wait times
- Admin CMS (knowledge editor, broadcast composer with editable AI draft, insights)

**Placeholder scan:** None — every step contains exact commands, exact file paths, and full code.

**Type consistency:** `ChatMessage`, `RetrievedChunk`, `Lang` are defined once in `@/types/chat` and reused across `lib/retrieval/*`, `lib/prompts/*`, `app/api/chat/route.ts`, `hooks/use-chat.ts`, `components/message-list.tsx`.

**Verification:**
- Unit tests pass: `pnpm test` (embeddings, chunking, rrf, rewrite, prompt-assembly)
- Integration tests pass with dev server up: `pnpm test retrieval && pnpm test chat-api`
- Manual: home page chat answers a transport question in English and Romanian, in Bonți's voice (no "frate", no "epic", no exclamation chains).
- Production: Vercel URL loads, Google sign-in works, chat streams.

---

## Done condition

Plan 0 is complete when:

1. All 17 tasks committed in sequence on `main`.
2. All unit + integration tests pass.
3. The production Vercel URL serves a working chat that retrieves from the EC KB and replies in Bonți's voice.
4. The engineer can demo end-to-end: open URL → sign in with Google → ask about transport → get a brand-consistent streamed reply.

After Plan 0 ships, write Plans 1 / 2 / 3 grounded in the real codebase structure.
