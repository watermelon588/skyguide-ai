# DAY-10

# 🌌 SkyGuide AI — Day 10 Implementation Report

> **Focus:** Identity of the *product itself* — a beautiful onboarding walk,
> a full visual redesign, and the first step into community.
>
> Date: 2026-07-15
>
> Scope: the First Light Guide, a landing-page polish pass, a complete
> design-system rewrite ("Bento / Electric Blue") applied page-by-page across
> the app, and Feature 6 Phase A (Observers Nearby — community discovery).

---

# Overview

Day 9 turned the engine into a product people use — a planner loop, target
panels, identities. Day 10 is about how that product **looks and grows**:

1. **First Light Guide** (Feature 5) — a public, immersive walkthrough that
   takes a new observer from sign-up to eyepiece, doubling as a logged-in
   checklist.
2. **Landing polish** (Feature 9 slice) — a live sky teaser and hover/ambient
   motion so anonymous visitors see real data.
3. **Redesign v2 — "Bento / Electric Blue"** — the big arc: a top-to-bottom
   visual rewrite replacing the old orange/glass/rounded look with a pure-black
   canvas, a single electric-blue accent, radius-0 everywhere, the Satoshi
   font, and bento layouts. Design logic only — **zero functional change.**
4. **Community — Phase A (Feature 6a)** — "who observes near me?": a
   privacy-first nearby-observers map on the gateway's geospatial index.

```
First Light Guide  ──▶  Landing polish  ──▶  Redesign v2 (page-by-page)
                                                        │
                                                        ▼
                                    Community Phase A — Observers Nearby
```

---

# Part 1 — First Light Guide (Feature 5)

A public `/guide` route in the `/tonight` visual language (starfield + reveal
system), built as a 9-step scroll page with a sticky rail that doubles as a
checklist.

| Piece | What |
|---|---|
| `pages/Guide.jsx` | Lazy route: shell, nav, hero, progress bar, closing CTA |
| `components/guide/GuideStep` | One step — hero visual, ≤120 words, deep-link CTA |
| `components/guide/GuideRail` | Sticky step rail; live checklist for signed-in users |
| `guide/guide.steps.jsx` | Content as data so copy edits never touch layout |
| `hooks/useGuideProgress` | Completion from existing state only — **no new backend** |

Nine steps: create account → set location → add telescope → read the dashboard
→ explore Tonight → plan a session → pair your phone → align & observe → log
it. Signed-in users get a progress bar + green ticks on the six trackable
steps (derived from auth / location / telescope / observations); anonymous
visitors see everything incomplete. Entry points: home nav, in-app navbar, and
the dashboard's empty-location card.

**Verified:** anonymous render (9 steps / rail / CTAs, no console errors), rail
scroll-offset math, lint + build. The signed-in checklist path was **not**
live-exercised — the Atlas DB was unreachable (`ESERVFAIL`) at that session's
end; the logic is a straightforward read of already-verified hooks.

---

# Part 2 — Landing Polish (Feature 9 slice)

- **`LiveSkyTeaser`** — computes a *real* sky (public visibility + moon) for a
  labelled showcase site (Kitt Peak) so anonymous visitors see live data;
  degrades to an inviting static panel when the engine/DB is unreachable.
- Hero ambient-glow layer, feature-card hover (lift + border glow), and the
  orange cursor-spotlight made opt-out (`SpotlightCard spotlight={false}`, off
  on the landing page).

*Future upgrade noted:* use the visitor's own geolocation behind an explicit
"Compute my sky" tap instead of the fixed showcase.

---

# Part 3 — Redesign v2: "Bento / Electric Blue"

The dominant arc of the day: a complete visual rewrite, applied surface by
surface. **Hard constraint:** design/look only — hooks, services, context,
props, and routes stay byte-for-byte identical. `DESIGN_SYSTEM.md` is the
rewritten single source of truth; `CLAUDE.md`'s design sections were updated to
match.

## 3.1 The system

| Token | Value | Was |
|---|---|---|
| Canvas | `#000000` pure black | `#090B10` |
| Surfaces | `#0A0A0B` / `#111214` / `#17181B` (flat tiers) | white-opacity glass |
| Hairlines | `#232427` (divider `#2E2F33`) | `border-white/10` |
| Accent | electric blue `#0049CD` (hover `#1E63FF`) | orange `#FF8C1A` |
| Text | GROOVYCLO gray ladder `#F6F6F6 → #6B6C70` | mixed |
| Radius | **0 everywhere** (enforced globally) | rounded |
| Font | **Satoshi** (self-hosted variable) | Geist / Inter |

**Rules that replaced the old ones:** glassmorphism is banned app-wide (no
`backdrop-blur`, no translucent cards); depth comes from surface tiers +
hairlines. Blue is the *only* saturated hue. Radius is `0` on every element.

## 3.2 Foundation (Phase 0)

- Satoshi variable font self-hosted (`public/fonts/`, `@font-face` in
  `styles/fonts.css`).
- Tokens in `index.css` `:root` + `@theme inline` → Tailwind utilities
  (`bg-bg`, `bg-surface-1/2/3`, `border-line`, `text-accent`, `text-ink/2/3/4`).
  Radius 0 enforced globally.
- **FX primitives** in `components/fx/` — reused on every page: `MagneticButton`,
  `Marquee`/`ScrollMarquee`, `SplitReveal`, `Reveal`, `BentoGrid`/`BentoCard`,
  `VideoBackground`, and a `gsap.js` helper (registers ScrollTrigger).

## 3.3 Pages converted

Home (hero video + GSAP split headline + bento feature grid), Login (editorial
split — full-bleed image + flat blue form), Dashboard (shell + card primitives;
telescope operations moved up), the full `/tonight` experience + `TargetPanel`,
Profile + PublicProfile, Guide, and global chrome (AppLayout, Navbar, AI
sidebar, ChatWidget, weather, telescope modals, UI primitives). The shared
`SpotlightCard`/`ScoreRing` and `vocabulary.scoreColor` were re-toned to flat
surfaces + blue score tiers.

**Token conversion pattern** (applied consistently): `#FF8C1A→accent`,
`#AAB4C5→ink-2`, `#6B7280→ink-3`, `white→ink`, `bg-white/5 + backdrop-blur →
bg-surface-2/3`, `border-white/10 → border-line`. SVG hex fills converted via
quoted-string replace so they didn't collide with `text-[#...]` classes.

## 3.4 Traps recorded (for the next session)

- **`--accent` collision:** shadcn's `App.css` defined a gray `--accent` and
  loaded *after* `index.css`, clobbering the blue. Fixed by removing `--accent`
  from both shadcn blocks so `index.css`'s `#0049CD` is the sole source.
- **Tailwind v4 + Vite HMR desync:** after editing `@theme`/`:root`, utilities
  paint stale colors — **restart the dev server** to confirm, don't trust the
  hot value.
- **`VideoBackground` z-index:** must sit at `z-0` inside a parent with
  `isolation: isolate`; at `-z-10` it paints behind the opaque black root and
  vanishes.

## 3.5 Status

**In progress — one surface remains: Align** (`pages/Align.jsx`,
`alignment-mode/*` overlay, alignment sensor panels, dev-only `AlignLab`),
followed by a final `git grep` sweep for stray `#FF8C1A` / `orange-` /
`bg-white/` / `backdrop-blur`. Auth-gated pages were verified via clean Vite
compile + no console errors; public pages (PublicProfile, Guide) were verified
live in the preview pane (black canvas, blue accent confirmed).

> **Note:** the entire redesign is currently **uncommitted** in the working
> tree (~40 modified + ~19 untracked files) alongside the Day-10 feature work.

---

# Part 4 — Community, Phase A: Observers Nearby (Feature 6a)

The discovery half of Feature 6 — "who observes near me?" — built entirely on
the gateway + frontend (zero astronomy), and unblocked by Day 9's profiles +
privacy. **No schema change**: the users' `2dsphere` index and the
`showApproxLocation` / `profileVisibility` fields already existed.

## 4.1 Gateway

- `GET /api/v1/community/nearby?radius=` (`protect`) →
  `communityService.findNearby()` runs a `$geoNear` over the users' index.
- **Privacy enforced at the data boundary** (same discipline as
  `profileService`): the aggregation `query` filters `profileVisibility ≠
  private`, `showApproxLocation ≠ false`, `isActive ≠ false`, and excludes self
  — using `$ne` so legacy docs missing those fields (defaults = public/share)
  are correctly included. The response is an explicit whitelist projection,
  never `toJSON()`.
- **Exact distance never leaves the server:** `distanceBand()` returns a coarse,
  non-invertible label (`under 1 km`, `~N km`, nearest-5 past 5 km) so meters
  can't be triangulated back to a home address.
- **Reciprocity gate:** a viewer who is themselves `private` gets
  `{ gate: "private" }`; a viewer with no location gets
  `{ gate: "no-location" }`. Both are normal `200` UX states, not errors — you
  must be discoverable to discover.
- `observedCount` = distinct observed `catalog_id`s via a `$lookup`
  sub-pipeline, matching the profile's distinct-count logic.

## 4.2 Frontend

`community.service.js` → `useNearbyObservers(radiusKm)` (React Query, keyed by
radius, `placeholderData: prev` so chip taps don't flash empty) →
`pages/Community.jsx` (protected, in `AppLayout`; added to `APP_PATHS`, lazy
route, navbar link). Components `community/{ObserverCard, RadiusSelector}`;
cards link to `/observers/:username` and reuse `profile/Avatar`. Every state
handled: loading skeletons, error, `gate=private` (→ `/profile`),
`gate=no-location` (→ `/dashboard`), empty range, and the results grid.

## 4.3 Files

```
server-gateway/src/
  services/communityService.js
  controllers/communityController.js
  routes/community.routes.js          (registered in app.js)
frontend/src/
  services/community.service.js
  hooks/useNearbyObservers.js
  pages/Community.jsx
  components/community/{ObserverCard,RadiusSelector}.jsx
  App.jsx, components/Navbar.jsx      (route + link)
```

---

# New Dependencies

**None this day.** The redesign self-hosts the Satoshi font (static asset, not
an npm package) and reuses the already-installed GSAP / three.js. Community
Phase A adds no packages — `$geoNear` is core MongoDB, and the frontend reuses
axios + React Query.

---

# Testing Requirements

## Prerequisites

1. Full stack from repo root: `npm run dev` (frontend 5173, gateway 5000,
   astro-engine 8000).
2. **Restart the gateway** after pulling — backend has no hot-reload.
3. A verified user with an observing location set.

## First Light Guide (Feature 5)

- Anonymous `/guide` renders all 9 steps + rail + per-step CTAs.
- Signed-in user with a location set sees step 2 checked; deep links land on
  the right surface.

## Redesign v2

- After any `@theme`/token edit, **restart Vite** before trusting colors.
- Sweep for regressions: `git grep -nE "#FF8C1A|orange-|bg-white/|backdrop-blur"`
  should be empty once Align is converted.
- Public pages render in the preview pane; auth-gated pages are compile-verified
  (screenshots time out when the pane is hidden — the WebGL starfield never
  idles; verify via DOM/computed-style reads).

## Community Phase A (Feature 6a)

- Seed two users ~10 km apart with locations set → both appear at 25 km radius;
  neither shows the other's exact coordinates in the JSON.
- A `private` user never appears in results; a private *viewer* gets the
  "you're set to private" gate; a viewer with no location gets the "set your
  location" gate.
- Radius chips (25 / 50 / 100) re-query; card links open the public profile.

## Known caveats / environment traps

- **Community Phase A is NOT live-verified** — the route is auth-gated and the
  gateway + Atlas weren't reachable in the build session (another chat held the
  dev server). Parses (`node --check`), lints clean, and builds; the `$geoNear`
  path + distance banding are logic-reviewed, not exercised.
- **Redesign Align surface + final grep sweep are still pending.**
- Backend has no hot-reload; screenshots time out on hidden WebGL panes.

---

# What's Committed vs Pending

- **Everything on Day 10 is uncommitted** at the time of writing — the redesign
  (~40 modified + ~19 untracked files) and the Community Phase A files share the
  working tree on `feature/user-profiles`.
- Session-by-session detail lives in the assistant's project memory
  (`redesign-v2-bento-blue`, `first-light-guide`, `community-discovery`).

---

# Next

Per `UPCOMING_FEATURES.md`:

1. **Finish Redesign v2** — convert the Align surface, then the final orange/
   glass grep sweep.
2. **Community Phase B** — regional chat rooms: reuse the existing socket.io
   server with a NEW event family (`chat:join` / `chat:message` /
   `chat:presence`) — never touching the alignment rooms or the AI ChatWidget.
   New `messages` / `rooms` collections; geohash-based room assignment computed
   on location save; history over REST, live over socket.
3. **Phase C** — safety/moderation (report, block, rate-limit, profanity
   filter, capped history).

Later systems (Notifications, AI Recommendation Engine) still depend on the
planner history and profiles as their fuel.
