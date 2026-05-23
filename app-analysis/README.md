# Electric Castle Android App — Replica Specification

A complete inventory of every screen, interaction, and design token in the official Electric Castle Android app (`com.electriccastle`, v6.0.0, built on the Appmiral festival-app platform). Captured 2026-05-23 from a Pixel 9 Pro XL emulator (Android API 36/37, 1344×2992 @ 480dpi).

The goal: hand this folder to an AI agent, get back a pixel-perfect, behavior-identical replica.

## How to use this doc

- **Screens** — each tab and sub-screen has a section below. Read the section, then look at the listed screenshot files in `screenshots/` for visuals.
- **UI hierarchies** — `ui-dumps/` contains `uiautomator dump` XML for every screen. Use these to get exact bounds, resource IDs, content-descs.
- **Design tokens** — the "Design system" section below has colors, fonts, spacing. Source files in `assets/` (fonts, styles.css, launcher icons).
- **APK** — `apk/base.apk` is the original installed APK (29.7 MB). `apk/extracted/` is the unzipped tree.

## App identity

| Field | Value |
|---|---|
| Display name | Electric Castle |
| Package | `com.electriccastle` |
| Version | 6.0.0 (versionCode 13, git sha `58f0c91ee`) |
| Launcher activity | `com.appmiral.splash.SplashActivity` |
| Main activity | `com.appmiral.base.tabs.MainActivity` |
| Min SDK | 28 (Android 9) |
| Target SDK | 36 |
| Platform | Built on **Appmiral** white-label festival app platform |
| Backend | `https://app.appmiral.com/function/` |
| Push | `https://api.cm.com/channelswebhook/push/v2/accounts` (CM.com) |
| Consent | Cookie Information SDK (`consent-api.app.cookieinformation.com`) |
| Audio interfaces | Spotify, SoundCloud, Mixcloud HTML bridges from `appmiral-audio.s3.eu-west-1.amazonaws.com` |

### Permissions declared

INTERNET, ACCESS_NETWORK_STATE, RECEIVE_BOOT_COMPLETED, VIBRATE, WRITE/READ_EXTERNAL_STORAGE, ACCESS_COARSE/FINE_LOCATION, WAKE_LOCK, POST_NOTIFICATIONS, NFC, FOREGROUND_SERVICE, SCHEDULE_EXACT_ALARM, CAMERA, ACCESS_ADSERVICES_*, GCM RECEIVE, Play Install Referrer.

NFC + CAMERA + ZXing barcode resources present → the app supports QR/NFC ticket scanning, though that flow wasn't reachable from the documented UI tree (likely activates closer to the festival).

## Festival context (captured in app)

- **Dates**: 16–19 July 2026 (+ "Camping Party" Wed 15 July)
- **Venue**: Bánffy Castle, Bonțida, Cluj, Transylvania, Romania
- **Festival days**: Camping Party (Wed 15 Jul) · Day 1 (Thu 16) · Day 2 (Fri 17) · Day 3 (Sat 18) · Day 4 (Sun 19)
- **Edition tagline visible**: "EC12" (12th edition)
- **Ticket prices visible in notifications**: GA pass 175 € + tax, Day ticket 89 € + tax
- **Headliners**: The Cure, Twenty One Pilots, Teddy Swims, Chase & Status, Wet Leg, Kneecap, LP, Mochakk, Nothing But Thieves, Wilkinson, Skream & Benga, Subtronics, Yung Lean & Bladee
- **Stages** (8): Main Stage by Coca-Cola · Hangar Stage by Banca Transilvania · Booha Stage by GLO · Hideout by #UnlockWonder · Ping Pong Stage by Burn Energy · Backyard Stage · The Beach · Camping Stage
- **Strategic Partner**: Lidl · **Main Sponsors**: GLO, Coca-Cola, Banca Transilvania, Heineken · **Super Sponsors**: Jameson, Burn · **Sponsors**: Lay's, Oral-B, Dove, Havana Club, ... (full list in `screenshots/more-sponsors*.png`)

---

## Information architecture

```
Splash (com.appmiral.splash.SplashActivity)
 │
 └─ MainActivity (bottom tab host, 5 tabs)
     │
     ├─ HOME ─────────────► Native feed (video carousel + cards + IG feed + social CTAs)
     │                       Each card → Chrome Custom Tab → electriccastle.com / electriccastle.ro
     │                       Top-right: notification bell, search icon
     │
     ├─ EC2026 TICKETS ───► Chrome Custom Tab → https://electriccastle.com/tickets
     │                       (Tabs: FESTIVAL ACCESS · DAY TICKETS · CAMPING ACCESS · ACCOMMODATION)
     │
     ├─ EC RADIO ─────────► Native player (single radio stream, play/pause; persistent mini-player)
     │
     ├─ LINE-UP ──────────► Native 2-column grid (heart-to-favorite per card)
     │   │                  Top-right: filter, search
     │   ├─ Filter modal (bottom sheet) ───► Favorites toggle + multi-select genre tags
     │   ├─ Search ────────────────────────► Search-as-you-type, results by section (ARTISTS / STAGES / PLACES)
     │   └─ Artist detail ─────────────────► Hero photo, TIMINGS list, SOCIALS row, favorite heart
     │
     └─ More ─────────────► Native list of 12 items:
         ├─ DAILY SCHEDULE ─────► Native grid by day (5-day picker dropdown)
         ├─ FAVORITE ACTS ──────► Native, empty state until user favorites artists
         ├─ EC VILLAGE ─────────► Chrome Custom Tab to electriccastle.com
         ├─ EC12 PLAYLIST ──────► Native track list (Spotify-backed, 641 tracks, in-app play)
         ├─ MY ACCOUNT ⬈ ──────► Chrome Custom Tab to electriccastle.ro/login
         ├─ FAQ ⬈ ──────────────► Chrome Custom Tab to electriccastle.ro/faq
         ├─ EC WALLPAPERS ──────► Native 3-col image grid → full-screen viewer with share
         ├─ STAGES ─────────────► Native list of 8 stages → stage detail (description, artists past/upcoming, gallery)
         ├─ SPONSORS & PARTNERS ► Native tiered list (Strategic / Main / Super / Sponsors)
         ├─ PARTNER LOCATIONS ⬈ ► Chrome Custom Tab
         ├─ SUSTAINABILITY ⬈ ───► Chrome Custom Tab
         └─ SETTINGS ───────────► Native (Push, Location, Spotify connect, Privacy)

Persistent overlays:
  • Top header on every native screen: black bar, white "TAB NAME", optional filter/search icons
  • Bottom navigation: 5 tabs, selected = red label + red icon, unselected = white
  • EC Radio mini-player: appears above bottom nav when radio is playing, all native screens
```

⬈ = opens Chrome Custom Tab (external chrome icon shown next to the item).

---

## Design system

### Brand colors

| Token | Value | Where |
|---|---|---|
| `main_brand_color` | `#EB0000` (rgb 235, 0, 0) | All red surfaces: countdown card, PLAY button, selected tab, hearts, links, social icons |
| `intake_stepper_active_color` | `#EB0000` | Stepper active state |
| `intake_stepper_inactive_color` | `#D4D4D4` | Stepper inactive state |
| Body background (CSS) | `#F4F4F4` | Light grey app background for white surfaces |
| Page background (native) | `#FFFFFF` | Most lists |
| Header bar | `#000000` | Toolbar across native screens |
| Status bar | `#000000` | Always black |
| Text — primary | `#000000` | Headings and body in light themes |
| Text — on-dark | `#FFFFFF` | Header titles, card overlays |
| Text — link | `#EB0000` | Underlined |

### Typography

Source: `assets/styles.css` (used by webview-rendered native cards). Six font files shipped: `Roboto-{Regular,Bold}.ttf`, `SofiaSans-{Regular,Medium,Bold,Black}.ttf`.

| Role | Font | Size (× --font-scale, default 1) | Style |
|---|---|---|---|
| h1 — page hero | SofiaSans-Bold | 28px | UPPERCASE, line-height 1.43 |
| h2 / h3 — section heads | SofiaSans-Bold | 18px | UPPERCASE, line-height 1 |
| h4 — sub-heads | SofiaSans-Bold | 16px | UPPERCASE, line-height 1 |
| h5 — labels | SofiaSans-Bold | 14px | UPPERCASE, line-height 1 |
| body / `<p>` | Roboto-Regular | 16px | sentence case, line-height 1.25 |
| `<ul>` lists | SofiaSans-Regular | 16px | line-height 1.25 |
| `<a>` link | SofiaSans-Medium | 16px | underlined, `#EB0000` |

**Native-screen toolbar title** (e.g., "MORE", "LINE-UP", "STAGES") → SofiaSans-Bold-ish, UPPERCASE, white-on-black, ~48dp font size (3rem on the 480dpi screen), left-aligned at ~24dp from edge after back arrow.

**Bottom nav labels** ("HOME", "EC2026 TICKETS", "EC RADIO", "LINE-UP", "More") → SofiaSans-Bold, UPPERCASE except "More" which is title case, ~10–11dp, sits ~6dp below the icon.

### Iconography

All icons are vector drawables (no PNG icons — only the launcher icon is a raster). The full icon set in `apk/extracted/res/drawable/ico_*.xml` includes:

- `ico_back_bidirection` (back arrow)
- `ico_favorite_artist_{list,photo,topbar}` (heart variants)
- `ico_bookmark_performance_{list,photo,topbar}`
- `ico_bookmark_poi_{list,photo,topbar}`
- App-internal: countdown digits, day-picker triangle, filter sliders, search magnifier, Chrome external-link arrow

### Launcher icon

Red square (`#EB0000`) with white bold italic "EC" wordmark. See `assets/ic_launcher.png`. Foreground is a separate adaptive-icon layer (`ic_launcher_foreground.png`); background is the flat red (`ic_launcher_background.png`).

### Bottom navigation

- Height 222 px (≈74 dp) on the test device
- 5 equal segments
- Each item: 60×60 px icon centered horizontally, label below
- Selected state: icon and label tinted `#EB0000`; unselected: white
- No background tint change on selection (only the icon/label color)

### Layout grid (LINE-UP, WALLPAPERS, DAILY SCHEDULE)

- LINE-UP and DAILY SCHEDULE: **2-column grid**, edge-to-edge (no horizontal padding around the grid)
- Card aspect ratio ≈ 1:1
- Artist name overlay: bottom-left, white SofiaSans-Bold-ish, 24px-ish, with subtle dark gradient behind for legibility
- Favorite heart: top-right of card, outline (unfavorited) or filled red (favorited), `#EB0000`
- WALLPAPERS: **3-column grid**, square cells, no gutter visible

### Spacing observations

- Standard horizontal screen padding around list rows: 48px ≈ 16dp
- Status bar height: 159 px ≈ 53dp (matches Android default + emulator)
- Toolbar height: 168 px ≈ 56dp
- Bottom nav height: 222 px ≈ 74dp
- Settings/More list row height: 192 px ≈ 64dp

---

## Screens — detailed

### HOME — `home-01-top.png` … `home-08-scroll7.png`

Native scrollable feed. Sections top to bottom:

1. **Video carousel header** (1344×~700 px / collapsing toolbar bound to scroll). Auto-playing festival promo video with concert footage. Top-right overlay icons (white on translucent black circle): notification bell with red dot when unread (content-desc "Open notification inbox screen. New notifications"), search magnifier (content-desc "Open the search screen"). Bottom-right of video: white pause/play button. Resource IDs: `carouselVideoView`, `carouselImageView`, `carouselVideoCoverImageView`. Multi-slide carousel: video is slide 1 ("Afis 1" / "Electric Castle 2026 carousel video"), additional poster slides (Afis 2 = Countdown, Afis 3 = Stay in EC Village, etc.) live in the same `androidx.viewpager.widget.ViewPager`.

2. **Countdown card** (red `#EB0000`, full-width). Centered "Countdown" label (white SofiaSans). Four columns: DAYS / HOURS / MIN. / SEC. with large white digits. Updates live every second.

3. **"STAY IN EC VILLAGE"** poster card. Aerial photo of camping village; overlay text "STAY IN EC VILLAGE" top, footer text "Tap here to read more about it." Tap → Chrome Custom Tab to electriccastle.ro EC Village page (`home-banffy-detail.png` shows the loaded webview with cookie banner).

4. **"DAY TICKETS ARE NOW AVAILABLE"** poster card. Black/red text over ferris-wheel photo. Tap → Chrome Custom Tab to electriccastle.com/tickets.

5. **"16-19 JULY 2026 / BANFFY CASTLE TRANSYLVANIA / CHECK THE DAILY SCHEDULE"** poster card. Hand-drawn-style typography over photo of Bánffy Castle.

6. **Lineup poster card**. Full lineup printed in the festival's signature stacked-text style (THE CURE × TWENTY ONE PILOTS / TEDDY SWIMS × CHASE & STATUS / WET LEG × KNEECAP × LP × MOCHAKK / …). Same image used on the website. See `home-02-scroll1.png`, `home-03-scroll2.png` for the full poster, going to many tiers of font size down to micro-text at the bottom.

7. **"This is Electric Castle"** info card. Square EC icon (red poster with "EC" + festival imagery), title "This is Electric Castle", body "Electric Castle is loved for its unique day & night vibe, award-winning quality, and artist praise.", clock icon + "Tap to read" link.

8. **"EC News"** horizontal scroll row. Cards with publication name + headline + photo. Visible: **Daily Star** ("ELECTRIC CASTLE 2026'S STAR-STUDDED LINEUP FEATURING HOLLYWOOD LEGEND KEANU REEVES"), **NME** ("KNEECAP, TEDDY SWIMS, WET LEG AND LOADS MORE JOIN ROMANIA'S ELECTRIC CASTLE 2026 LINE-UP"). More to the right (chevron `>` next to "EC News" suggests "see all").

9. **Instagram-style social feed**. Posts from `@ElectricCastle` (resource IDs `img_image_body`, hashtags rendered inline in `#EB0000`):
   - Post 1: photo of festival-goers, caption "One long weekend of late-night walks back to the tent and mornings that start sometime around noon.", hashtags `#ElectricCastel #EC12 #ECVillage`, "20h" timestamp.
   - Post 2: video card "Local acts you definitely want to see at ELECTRIC CASTLE" with white arrow indicating a multi/video post, "21 May, 5:32 PM", caption "Don't sleep on these local DJs", `#ElectricCastle #EC12`.
   - Post 3: olive/yellow "6 AM" graphic + tents photo, caption "At EC Village by Lidl, mornings blur into afternoons, nights into mornings, and somehow the music never feels far away.", `#ECVillage #EC12 #ElectricCastle`.

10. **"Add your favorites"** card. Red `#EB0000`, white heart icon right. Text: "Personalise your app and festival experience by adding more artists to your favorite list."

11. **"Connect your Spotify music"** card. Red `#EB0000`, Spotify icon right. Text: "Unlock the full music experience by connecting your Spotify Premium account! Discover more artists and based on your music preferences."

12. **"Follow Us"** row. Four social icons in red `#EB0000` circles: Facebook, Instagram, TikTok, YouTube.

### HOME header — `header-notifications2.png`, `header-search.png`

- Notifications inbox (native). Title "NOTIFICATIONS" with a search icon top-right. List rows: small color emoji + bold title + 2-line body preview + small grey timestamp on the right (e.g., "20 May, 1:09 PM"). Sample notifications:
  - 🎉 "EC Village Awaits 🎉" — The best moments don't happen on schedule. Stay in EC Village…
  - 🔴 "Almost over" — Final chance to get EC12 tickets at 175€ + tax…
  - ⚡ "Final hours of sale" — The ticket sale ends tonight at 23:59…
  - 🔴 "Only 2 days left", "72 hours left", "Few days left", "Ticket sale is on", …

- Global search (native, also reachable from LINE-UP). Header is a search input with a leading magnifier and a trailing X. Empty state shows a centered red magnifier, "Searching for something?", body copy "You can search for your favorite artists, places or just general info. We hope you find what you seek.", followed by a wrap-grid of **suggested genre chips** (each chip is a different fill color — see `lineup-search-empty.png`):
  - Green: DANCEFLOOR DRUM AND BASS
  - Cyan: ELECTRO · ALTERNATIVE
  - Pink: OLD SCHOOL HIP HOP
  - Red: ALTERNATIVE ROCK · POST PUNK ROCK · ART-PUNK
  - Yellow: INDIE · AMAPIANO · DANCE-PUNK · INDIE ROCK
  - Orange: ART ROCK · INDIE HOUSE · REGGAETON · LATINO · MELODIC HOUSE
  - Typing produces results grouped by section, e.g. "ARTISTS" header with right-aligned count, hit row = thumbnail + name (see `lineup-search-cure.png` for "cure" → 1 result, "THE CURE"). A floating ≡ hamburger button on the left margin lets users toggle which section types are searched.

### EC2026 TICKETS — `tickets-01-top.png`

**Not a native screen** — opens **Chrome Custom Tab** (`com.android.chrome/org.chromium.chrome.browser.customtabs.CustomTabActivity`) to `https://electriccastle.com`. Visible:
- CCT chrome header (red `#EB0000`): X close, "Buy Tickets | Electric Castle" + small `electriccastle.com` subtitle, share, three-dot.
- Site-side header: EC logo + "BUY TICKETS" pill + cart "(0)" + "EN" language switcher + hamburger.
- Site nav tabs: **FESTIVAL ACCESS · DAY TICKETS · CAMPING ACCESS · ACCOMMODATION**.
- Yellow-outline button "SEE HOW EASY IT IS TO GET TO ELECTRIC CASTLE".
- Cookie banner (Cookie Information SDK): "This website uses cookies." with ALLOW ALL (grey) and CUSTOMIZE (yellow) buttons, plus "Show details >".
- First product card visible behind the banner: "General Access Pass + Insurance", DETAILS pill (teal), **270 EUR + booking fee 8%**.

Replica behavior: tap → launch `CustomTabsIntent` to a configurable URL.

### EC RADIO — `radio-01-top.png`, `radio-03-playing-real.png`

Native, single-stream player.

- Toolbar: back arrow + "EC RADIO" title.
- Top white card (`com.electriccastle:id/playlist`): square EC Radio logo on left (yellow EC ticket graphic with antenna lines), title "EC Radio", subtitle "Just another radio, but good." (resource IDs `imgPlaylist`, `txtPlaylistTitle`, `txtPlaylistDescription`).
- Full-width red `PLAY` button (`btnPlay`, `textBtnPlay`), 1248×144 px (≈416×48 dp), centered text, red `#EB0000`.
- Below: light grey area with the sketchy festival-themed line-art background (`playlistBackgroundImage`) — speakers, balloon, rubber duck, hangar, drum, trees, "YOU ARE SOMETHING" sign, etc. Used everywhere as the empty-state / decorative background.
- When playing: a **mini-player bar** appears above the bottom nav: small EC Radio logo + "EC Radio" text + circular pause button on the right. This mini-player **persists across all native screens** until paused/stopped, and tapping it presumably opens a full player (unverified but standard pattern).

### LINE-UP — `lineup-01-top.png` through `lineup-38-scroll37.png`

Native 2-column grid of artist cards. Sorted alphabetically (not by day).

- Header: "LINE-UP" title + filter icon (sliders, `action_filter`) + search icon (`action_search`).
- Each card: ~660×660 px (≈220×220 dp), edge-to-edge, ~6 px gutter, artist photo cropped to fill, dark gradient bottom-third, white SofiaSans-Bold-ish artist name overlay at bottom-left (~36 dp from bottom, ~24 dp from left), heart icon top-right (24 dp from each edge). Artists with no photo show a fallback: solid black background + the red "EC" ticket logo placeholder (e.g., MR. GOODALF, NEW DISORDER, VYGO — see `lineup-30-scroll29.png`).
- Tap card → Artist detail (see below).
- Tap heart → toggle favorite (no navigation, no toast observed).
- Total artists captured by scrolling: **~150+ acts**. Roughly the first 25 are the major draws; the rest are local Romanian acts and DJs.

**Filter modal — `lineup-filter-options-small.png`, `lineup-filter-scroll1.png`, `lineup-filter-scroll2.png`**

Bottom sheet with drag handle. Contents:
- Heading row: "FILTER" centered, "RESET ALL" link top-right in soft red.
- **Favorites** row: title "Favorites", sub-label "Show only your favorites", trailing iOS-style toggle (off by default).
- **TAGS** expandable section (open by default, chevron down). Each tag is a checkbox row (square outline checkbox + label). Captured tags include:
  - Post Punk Rock · Alternative · Pop · Drum and Bass · Indie · Irish Rap · Pop Rock · House · Tech House · Dancefloor Drum and Bass · Dubstep · UK Garage · Cloud Rap · Alt-Pop · Indie Rock · Alternative Rock · Melodic Techno · Progressive House · Techno · Soul · R&B · Trip-Hop · Electronic Rock · Cinematic Techno · Italo Disco · Afro House · Nu-Disco · Melodic House · Concious Hip Hop · Indie Electronic · Hyperpop · Deep House …
- Footer: full-width red `#EB0000` **SAVE** button, slight grey separator above it.

**Artist detail — `lineup-artist-detail.png`**

Minimal native page:
- Toolbar with just a back arrow (no title text).
- Hero photo, full-width, ~1100 px tall (≈365 dp). Artist name overlay bottom-left in white SofiaSans-Bold-ish, ~36 dp.
- "TIMINGS" section header (SofiaSans-Bold black uppercase, ~16 sp). One row per scheduled performance: day label on the left (e.g., "Friday"), red heart on the right to toggle favorite for that specific timing.
- "SOCIALS" section header. Up to 4 red `#EB0000` circular icon buttons inline: web (globe), Facebook, Instagram, YouTube. Tap → Chrome Custom Tab to the corresponding URL.
- Decorative festival-sketch background fills the white space below the content.
- A real artist's page may also include description (`artists_detail_section_body` string exists), friends-also-like (`artists_detail_section_friends_title`), related artists (`artists_detail_section_related`), and an "all timings" CTA (`artists_detail_btn_all_timings`) — these sections appear conditionally when data is present.

### MORE — `more-01-overview.png`

A native list of 12 row items. Each row: leading 24dp icon + title + trailing chevron `>` (native screen ahead) **or** trailing external-link icon `⬈` (opens Chrome Custom Tab). Title styling: SofiaSans-Bold UPPERCASE, ~14 sp, black on white. Row height ≈ 64 dp (192 px). Divider is a thin grey 1 px line.

| # | Item | Icon | Trail | Destination |
|---|---|---|---|---|
| 1 | DAILY SCHEDULE | calendar | `>` | Native (day-grouped artist grid) |
| 2 | FAVORITE ACTS | heart | `>` | Native (empty state until user favorites) |
| 3 | EC VILLAGE | triangle/mountain | `>` | Chrome Custom Tab → electriccastle.com EC Village page (despite chevron) |
| 4 | EC12 PLAYLIST | playlist lines | `>` | Native (Spotify-powered track list) |
| 5 | MY ACCOUNT | person | `⬈` | Chrome Custom Tab → electriccastle.ro login |
| 6 | FAQ | i in circle | `⬈` | Chrome Custom Tab → electriccastle.ro FAQ |
| 7 | EC WALLPAPERS | picture frame | `>` | Native (3-col gallery) |
| 8 | STAGES | film/clapboard | `>` | Native (8 stage cards) |
| 9 | SPONSORS & PARTNERS | briefcase | `>` | Native (tiered logo list) |
| 10 | PARTNER LOCATIONS | pin | `⬈` | Chrome Custom Tab |
| 11 | SUSTAINABILITY | person+heart | `⬈` | Chrome Custom Tab |
| 12 | SETTINGS | gear | `>` | Native (prefs) |

#### DAILY SCHEDULE — `more-daily-schedule.png`, `more-daily-day-picker.png`

- Toolbar: back · red **"WEDNESDAY ▼"** day name with a small triangle indicating a dropdown · filter · search.
- Same 2-column artist grid as LINE-UP, but filtered to artists scheduled on the selected day. Each card adds a sub-label under the artist name with the day (e.g., "Wednesday"). Wednesday lineup (Camping Party) is sparse — only 2 acts visible (WILKINSON, PARTIBOI69).
- Tapping the toolbar title opens a **day-picker dropdown** that overlays the top of the screen. Rows (left = label, right = day name):
  - **Camping Party / 15 July** ↔ **Wednesday** (selected = red)
  - Day 1 / 16 July ↔ Thursday
  - Day 2 / 17 July ↔ Friday
  - Day 3 / 18 July ↔ Saturday
  - Day 4 / 19 July ↔ Sunday

#### FAVORITE ACTS — `more-favorite-acts.png`

Empty-state page (until user favorites artists):
- Toolbar: back · "FAVORITE ACTS" · search.
- Centered red microphone icon, h3 "My event", body "You haven't liked any performances yet. Like performances to create your personal schedule."
- Same sketch background.

#### EC12 PLAYLIST — `more-ec12-playlist.png`

- Toolbar: back · "EC12 PLAYLIST".
- Header row: small square album art ("OFFICIAL PLAYLIST" red graphic on black) + title "EC12 Official Playlist" + sub "By Electric Castle" + meta "641 tracks".
- Full-width red `#EB0000` `PLAY` button.
- Vertical track list. Each row: 48×48 px album thumbnail · 2-line text (track title bold black + artist grey) · ~96 px row height. Sample (in this order): Loreley — Kölsch · Grey — Kölsch · Stressed Out — Twenty One Pilots · Heathens — Twenty One Pilots · It's Only Real — Denis Sulta · Get Ready — Congo Natty · Slow Down (feat. Jorja Smith) – Vintage Culture & Slow Motion Remix — Maverick Sabre, Jorja Smith, Vintage Culture, Slow Motion · Ride — Twenty One Pilots · …
- The "Connect your Spotify music" CTA on Home suggests tracks are streamed via the user's Spotify Premium when connected, with a fallback Spotify-preview path otherwise (`audioplayer_*` strings).

#### EC WALLPAPERS — `more-wallpapers.png`, `more-wallpaper-detail-loaded.png`

- Toolbar: back · "EC WALLPAPERS".
- 3-column square grid, no gutter, edge-to-edge.
- Tap a tile → full-screen detail screen with the image centered, toolbar shows "EC WALLPAPERS" + back + **share** icon (top-right, used to share/save image). White background, image scales to fit width.

#### STAGES — `more-stages.png` ... `more-stages-scroll3.png`, stage detail in `more-stage-detail.png`, `more-stage-detail-scroll.png`

- List page: vertical full-width photo cards (~675 px tall ≈ 225 dp) with **black-to-transparent gradient at the bottom** and stage name overlay in white SofiaSans-Bold uppercase, ~36 dp.
- 8 cards in this order: MAIN STAGE BY COCA-COLA · HANGAR STAGE BY BANCA TRANSILVANIA · BOOHA STAGE BY GLO · HIDEOUT BY #UNLOCKWONDER · PING PONG STAGE BY BURN ENERGY · BACKYARD STAGE · THE BEACH · CAMPING STAGE.
- Stage detail (sample MAIN STAGE BY COCA-COLA):
  - Top: hero photo (no overlay text).
  - Black bar with white "MAIN STAGE BY COCA-COLA" (h3 SofiaSans-Bold).
  - "DESCRIPTION" h4 + body paragraph (Roboto-Regular): "Our biggest stage is where the most awaited artists perform. Here you can enjoy the most spectacular EC moments, sharing climax with thousands of people like you. Thrilling. / At the Main Stage you can listen to: the most spectacular live shows and DJ sets."
  - "ARTISTS WHO WILL PLAY HERE AT EC12:" list (TWENTY ONE PILOTS, THE CURE …).
  - "ARTISTS WHO PLAYED HERE:" long historical list (JUSTIN TIMBERLAKE, TWENTY ONE PILOTS, GORILLAZ, MASSIVE ATTACK, SKRILLEX, MACKLEMORE, FLORENCE + THE MACHINE, JUSTICE, CHASE AND STATUS, QUEENS OF THE STONE AGE, THIRTY SECONDS TO MARS, JESSIE J, IGGY POP, THE PRODIGY, DEADMAU5, BRING ME THE HORIZON, LIMP BIZKIT, YUNGBLUD, RUDIMENTAL, KHRUANGBIN, SIGUR ROS, CARIBOU, ALT-J, DAMIAN MARLEY, FRANZ FERDINAND, PAUL KALKBRENNER).
  - Photo gallery at the bottom (more concert photos for that stage).

#### SPONSORS & PARTNERS — `more-sponsors.png`, `more-sponsors-scroll1.png`, `more-sponsors-scroll3.png`

Vertical scroll of grouped logos on white background. Section headers in SofiaSans-Bold UPPERCASE italic-ish, centered (~`h4`):
- **STRATEGIC PARTNER**: Lidl
- **MAIN SPONSORS**: GLO ("HERE WE glo"), Coca-Cola, **BT** (Banca Transilvania), Heineken
- **SUPER SPONSORS**: Jameson, Burn (fire flame logo), Lay's …
- **SPONSORS**: Oral-B, Dove, Havana Club, … and more partially captured

Tap a logo → likely Chrome Custom Tab to brand page (untested).

#### SETTINGS — `more-settings.png`

- Toolbar: back · "SETTINGS".
- **PREFERENCES** h4 section:
  - **Push Notifications** — trailing state "**ON**" (red, with chevron `>`). Helper text: "Used to keep you up to date on all event related content and notify you when your favorite artist is about to start."
  - **Location** — trailing state "**OFF**" (with chevron). Helper text: "Used to show your current position on the map."
- **ACCOUNTS** h4 section:
  - **Spotify** — trailing iOS-style toggle (off). Body: "Connect your Spotify account to unlock the full music experience!"
- **PRIVACY** h4 section:
  - **Privacy Statement** — chevron link.
- Footer (centered small grey): **v6.0.0 [58f0c91ee]**.
- Sketch background fills the rest.

---

## Behavior contracts (must be 1:1 in replica)

1. **Splash → Main** boot path with the Appmiral splash screen (red EC square + wordmark).
2. **Bottom nav** is persistent on every native screen. Tab selection updates icon+label tint to `#EB0000`; the previously selected tab returns to white.
3. **HOME video** auto-plays muted on tab focus; pauses when leaving the tab; pause/play toggled by the white circular button bottom-right of the video. ViewPager auto-rotates between the video and the static poster slides every ~5s.
4. **All "card" surfaces on HOME except the IG feed and the Spotify/Favorites/Follow Us strip** open a **Chrome Custom Tab** (not an in-app webview) themed `#EB0000`, with a close X. The destination URL is the corresponding electric-castle.com/ro page. Cookie consent (Cookie Information SDK) appears on first load.
5. **EC2026 TICKETS** bottom-nav tab does **NOT** load a native screen — it directly fires a Chrome Custom Tab. Returning from chrome restores the previously selected native tab.
6. **EC RADIO play** plays a single live stream (single-track audio focus, foreground service: see `android.permission.FOREGROUND_SERVICE`). Mini-player overlay shows on every native screen; tapping it likely re-opens the radio tab.
7. **LINE-UP filter** is a bottom-sheet modal (drag-handle, dim scrim). SAVE applies and dismisses; RESET ALL clears toggles inline. Filter state persists across tab switches.
8. **Search** is a separate full-screen activity reachable from both HOME toolbar and LINE-UP toolbar; same UI, same suggested-genre chips, same result grouping.
9. **Heart icon** on any artist card or timing row toggles favorite. Favorites surface in (a) the home "MY EVENT"-style favorites screen, (b) the Daily Schedule filtered view, (c) the LINE-UP filter's "Favorites" toggle, and (d) likely drive personal push notifications ("notify when your favorite artist is about to start").
10. **Day picker** dropdown is a custom overlay (not a native Spinner) anchored to the toolbar. Five day rows. Selecting one re-filters the grid and dismisses the dropdown.
11. **Spotify connect** in Settings uses standard OAuth (`https://accounts.spotify.com/authorize`). Once connected, the EC12 PLAYLIST plays via Spotify Premium; otherwise the audio bridges (`spotify-audio-interface.html` from `appmiral-audio.s3.eu-west-1.amazonaws.com`) handle preview playback.
12. **Notifications inbox** is reachable via the home toolbar bell. Bell shows a small red dot when unread.
13. **No login required** for browsing — login (MY ACCOUNT) is only used for ticket purchases on electriccastle.ro.

---

## File inventory

```
app-analysis/
├── README.md                                  ← this file
├── capture.sh                                 ← helper script for screenshot+UI-dump pairs
├── screenshots/                               ← 96 PNGs (1344×2992 each), grouped by screen
│   ├── home-01-top.png ... home-08-scroll7.png         (HOME feed top→bottom)
│   ├── home-banffy-detail.png, home-tap-ecvillage.png, home-webview-after-cookies.png  (CCT example)
│   ├── header-notifications2.png, header-search.png    (header actions)
│   ├── tickets-01-top.png                              (CCT for tickets)
│   ├── radio-01-top.png, radio-03-playing-real.png     (EC RADIO incl. mini-player)
│   ├── lineup-01-top.png ... lineup-38-scroll37.png    (full 2-column grid scroll, ~150 artists)
│   ├── lineup-filter-options-small.png, lineup-filter-scroll1/2.png  (filter sheet)
│   ├── lineup-search-empty.png, lineup-search-cure.png (search UI)
│   ├── lineup-artist-detail.png                        (artist page)
│   ├── more-01-overview.png, more-tab-overview.png     (MORE list)
│   ├── more-daily-schedule.png, more-daily-day-picker.png
│   ├── more-favorite-acts.png
│   ├── more-ec-village.png                             (CCT)
│   ├── more-ec12-playlist.png
│   ├── more-my-account.png, more-faq.png               (CCT)
│   ├── more-wallpapers*.png, more-wallpaper-detail-loaded.png
│   ├── more-stages*.png, more-stage-detail*.png
│   ├── more-sponsors*.png
│   └── more-settings.png
├── ui-dumps/                                  ← 93 `uiautomator dump` XMLs (paired with screenshots)
├── assets/                                    ← extracted brand assets
│   ├── ic_launcher.png                                (round-square red app icon with "EC")
│   ├── ic_launcher_foreground.png, ic_launcher_background.png
│   ├── fonts/                                         (Sofia Sans family + Roboto)
│   └── styles.css                                     (in-app CSS with the full design system)
└── apk/
    ├── base.apk                               ← original installed APK (29.7 MB)
    └── extracted/                             ← unzipped tree (res/, assets/, AndroidManifest, classes*.dex, …)
```

## Gaps / things not yet exhaustively captured

These were either trivially gated (require auth/data) or low priority for visual replica:

- Notification deep-link payload behavior (tapping a notification card)
- Ticket QR/NFC scanning flow (CAMERA + NFC + ZXing resources are present)
- Connected-Spotify-account playback UI (full-screen player, queue, controls)
- Map screen (no map menu visible in this build, but Appmiral framework supports it — see `advanced_filter_section_map_categories`)
- Onboarding flow (visible string keys: `accept_terms_*`, `onboarding_*`) — would appear on first launch only
- Language selector and Romanian localization (defaults to EN; the website widget shows EN with dropdown)
- Artist detail with friends/related (only saw the minimal variant; Appmiral supports more)
- Push notification permission prompt
- "EC News" → Daily Star / NME card tap destinations (likely Chrome Custom Tab to original article)
- Sponsor logo tap destinations
