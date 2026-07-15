# DAY-9

# 🌌 SkyGuide AI — Day 9 Implementation Report

> **Focus:** From engineering demo to product — the astronomy platform, the
> observing loop, and the observer's identity.
>
> Date: 2026-07-12
>
> Scope: a design-system rewrite, the immersive `/tonight` experience, a
> redesigned landing + dashboard, a large astronomy-engine expansion, and
> five product features (Planner, Target Panel + guided observing, Science
> Surfacing, Auth UX, User Profiles).

---

# Overview

Day 8 ended with a backend that could answer *"how far is my telescope from
the target?"*. Day 9 turned that engine into a **product a person actually
uses**: a cinematic sky report, a decide → point → log loop, a real identity,
and the account plumbing (password reset, email verification) that a real
sign-up needs.

The work divides into three arcs:

1. **Presentation** — a codified design system, the `/tonight` immersive
   route, a redesigned home page + footer, and a two-act dashboard.
2. **Science** — the astro-engine gained moon-aware scoring, rise/set/transit
   times, filled sky-quality fields, satellite passes, and an observation
   planner in the gateway.
3. **Product features** — Planner UI, Target Panel + guided observing,
   Science Surfacing, Auth UX, and User Profiles, all sequenced in a new
   `UPCOMING_FEATURES.md` roadmap.

```
Design system  ──▶  /tonight experience  ──▶  Home + Footer  ──▶  Dashboard
                                                                      │
Astro-engine expansion (moon scoring, rise/set, satellites)  ────────┤
Gateway: observation planner CRUD  ──────────────────────────────────┤
                                                                      ▼
Feature 1 Planner UI ▶ 1.5 Target Panel + guided observe ▶ 3 Science
   ▶ 2 Auth UX ▶ 4 User Profiles
```

---

# Part 1 — Presentation

## 1.1 Design System (`DESIGN_SYSTEM.md`)

Rewrote the design system as an audit-grounded single source of truth
(measured from the live frontend: color tallies, tokens, component
inventory), modelled on the portfolio project's teardown style. Locked the
palette (`#090B10` canvas, orange `#FF8C1A` accent, the white-opacity glass
recipe), the motion scale (0.25–0.4s), and the "orange is a signal, not a
theme" rule. Logged real drift for later cleanup (a stale purple theme in
`index.css`, three icon libraries, Geist-vs-Inter).

## 1.2 The `/tonight` Experience

A standalone immersive route — the personalized celestial report. Lazy-loaded
(carries the GSAP/three.js stack), outside `AppLayout` like Alignment Mode.

| Piece | What |
|---|---|
| `Starfield` | Three.js parallax star layers, cursor drag, pauses when tab hidden, disposed on unmount |
| `TonightHero` | GSAP character-mask title reveal, live clock, location chips |
| `StatStrip` | Six count-up stat tiles |
| `SkyDome` | Polar alt-az SVG chart, all objects plotted, hover readout, type filters |
| `TopTargets` | Featured #1 card + ranked rows |
| `MoonPanel` / `ConditionsPanel` | Lunar dossier (SVG phase disc) + observing conditions |
| `CatalogTable` | The full sortable/filterable "Deep-Sky Ledger" |

Data comes from `useTonight` — four React Query streams (visibility, moon,
weather, catalog) merged client-side by `catalog_id`. No astronomy in React.

## 1.3 Home Page + Footer

Rebuilt the landing page in the `/tonight` visual language: `HomeNav`
(auth-aware), `HomeHero` (GSAP masked reveal), `FeatureGrid` (six spotlight
cards), `HowItWorks` (three steps + count-up proof band), `CtaFooter`, and a
proper site `Footer` (nav, socials, back-to-top). Fixed a real crash in the
shared `Navbar` (called `navigate()` without importing `useNavigate`).

## 1.4 Dashboard Redesign

Two acts: **Tonight at a Glance** (welcome header + live stat/target bento
reusing the `/tonight` components) and **Observatory Setup** (the existing
operational cards). Introduced `useEnteredView` (rect + capture-phase scroll
listener) so count-up/reveal animations fire inside the dashboard's *inner*
scroll container, where window-bound ScrollTrigger never fires.

---

# Part 2 — Astronomy Engine Expansion

## 2.1 Moon-aware visibility scoring (`visibility_service.py`)

Every visible object now carries:
- `airmass` — Kasten & Young (1989), accurate to the horizon
- `moon_separation_deg` — topocentric great-circle in the alt/az frame
- `moon_penalty` — illuminated-fraction × proximity, capped at 35% of score
- plus a response-level `moon` summary (alt/az/illumination)

## 2.2 Rise / transit / set (`coordinate_service.py`)

New analytic, vectorised `rise_transit_set_batch` (hour-angle method,
refraction horizon). Objects report local `rise`/`transit`/`set`, `circumpolar`,
and `hours_until_set`.

## 2.3 Filled reserved fields

- **Moon** (`moon_service.py`): `moon_penalty`, `sky_brightness`,
  `lunar_target_score` (peaks at the quarters), `supermoon`. `earthshine`/
  `eclipse` remain honestly null.
- **Conditions** (`observing_conditions_service.py`): `seeing` and
  `transparency` estimates (1–5 weather heuristics) + `moon_penalty` folded
  into the observing score. `bortle_class` stays null (needs a light-pollution
  dataset).

## 2.4 Satellite passes (`satellite_service.py`, `/api/v1/satellites/passes`)

Skyfield/SGP4 over Celestrak "stations" TLEs, cached on disk
(`astro-engine/data/stations.tle`, 24h TTL, stale-tolerant, gitignored).
Returns rise/peak/set with azimuths, peak altitude, and duration.

## 2.5 Observation planner CRUD (gateway)

`/api/v1/observations` — model `Observation`, `observationService`, thin
controller. Lifecycle `planned → observed | skipped`, one planned entry per
object (partial unique index → 409), notes, priority, `resolvedAt`.

---

# Part 3 — Product Features

## Feature 1 — Observation Planner UI

`observation.service` + `useObservations` (single query, optimistic
mutations); `AddToPlanButton` (shared, "On plan ✓" state) wired into the
drawer/ledger/glance; `PlannerCard` (live status, notes, history, Messier
progress); `MarkObservedChip` (one-tap log on alignment lock).

## Feature 1.5 — Target Panel + Guided Observing + Dashboard IA v2

- **`/tonight/:id`** — a dedicated target panel (`useTargetDetail` resolves
  from the `useTonight` cache): hero, live-geometry visibility strip, data
  sheet, plan + **Start Observing**. Every object click app-wide now navigates
  here; the side drawer was retired.
- **Guided observe flow** — Start Observing → `/dashboard?observe=<id>` →
  checks telescope → pairing → auto-aims the alignment engine and opens the
  overlay (the user never picks the target manually). Highlights/scrolls the
  card that needs attention.
- **Dashboard IA v2** — greeting → Observer → Telescope → glance → Moon →
  chart → conditions → plan → operations.

## Feature 3 — Science Surfacing

Ledger gained **Airmass / Moon-° / Sets** columns (Sets-ascending = "catch
these first", <2h orange); glance rows swap magnitude for "sets HH:MM" under
4h; new **`IssPassCard`** (next pass + countdown chip <3h) beside the planner;
MoonPanel shows lunar target score + supermoon badge.

## Feature 2 — Auth UX

New pages on a shared `AuthShell`: `/forgot-password`,
`/reset-password/:token` (strength hint, auto-login, expired-token dead-end),
`/verify-email` (post-signup **inbox waiter** with cross-tab `localStorage`
handoff) and `/verify-email/:token` (token redeemer). LoginPage gained the
forgot link, signup→verify hand-off, and an inline resend on 403-unverified.
**Gateway fixes:** reset/verification emails now link **frontend** routes via
`getClientUrl()` (the reset email previously linked a `PATCH` API endpoint —
unusable from a click); `forgot-password` returns a generic 200 for unknown
emails (removes an account-enumeration leak).

## Feature 4 — User Profiles

- **Gateway:** `profileService` + controller; `GET/PATCH /users/me/profile`,
  `POST/DELETE /users/me/avatar`, `GET /observers/:username`. New `optionalAuth`
  middleware powers the public route's visibility gate. Reverse geocoding
  (`utils/geocode.js`, Nominatim, built-in https, best-effort) fills the
  coarse city/region label on location save.
- **Privacy** is enforced in the service by explicit whitelist (never
  `toJSON`): public payloads carry no email or coordinates. Gates:
  private→404 (non-owner), observers→403 (anon), owner always 200.
- **Frontend:** `/profile` (editable: avatar, display name, bio, 3-way
  visibility, approx-location toggle, observing résumé) and `/observers/:username`
  (public). `Avatar` (image-or-initials), `AvatarUploader`, navbar avatar link.
- **Avatar decision:** client-cropped 256px data URL stored inline
  (canvas → WEBP ≤200KB), **not Cloudinary** — shipped credential-free;
  `avatarPublicId` + the avatar endpoint are the CDN swap-in points.

---

# New Dependencies

## Added this day

| Package | Where | Why |
|---|---|---|
| `gsap` ^3.15 | frontend | Scroll choreography, hero reveals (`/tonight`, home, dashboard) |
| `@gsap/react` ^2.1 | frontend | `useGSAP` hook |
| `three` ^0.185 | frontend | `Starfield` night-sky canvas |

**No new backend dependencies.** Satellite passes reuse the already-installed
`skyfield`; reverse geocoding and TLE fetch use Node's built-in `https`.

## External services / configuration required

| Service | Key needed? | Used by | Notes |
|---|---|---|---|
| OpenWeather | Yes (`OPENWEATHER_API_KEY`) | Conditions | Pre-existing; engine 503s cleanly without it |
| Nominatim (OSM) | No | Reverse geocoding | Rate-limited ~1/sec; called once per location save; best-effort |
| Celestrak | No | ISS passes | TLEs cached 24h on disk; stale-tolerant |
| SMTP / nodemailer | Yes | Verify + reset emails | Emails won't send without SMTP creds configured in the gateway |
| `getClientUrl()` | Config | Email links | Must resolve to the **frontend** origin per environment, or reset/verify links break |
| Cloudinary | **Not used** | (future avatars) | Avatars are inline data URLs today; endpoint is the drop-in point |

---

# Testing Requirements

## Prerequisites

1. Run the full stack from repo root: `npm run dev` (frontend 5173, gateway
   5000, astro-engine 8000).
2. **Restart all three services** — much of this day's backend work does not
   hot-reload; a server running since before Day 9 serves stale code.
3. A verified user with an observing location set (rankings/chart/moon/
   conditions render nothing without a location).

## By feature

**Astronomy engine**
- `POST /api/v1/visibility/observable` → objects carry `airmass`,
  `moon_separation_deg`, `moon_penalty`, `rise`/`transit`/`set`,
  `circumpolar`, `hours_until_set`; response has a top-level `moon`.
- Verify circumpolar handling at high latitude (e.g. lat 65) — those objects
  report transit only, `set: null`.
- `POST /api/v1/moon/current` → `reserved` has `moon_penalty`,
  `sky_brightness`, `lunar_target_score`, `supermoon` populated.
- `POST /api/v1/satellites/passes` (`{latitude, longitude, timezone, hours}`)
  → rise/peak/set triples above 10°.

**Planner (Feature 1)**
- Add a target from the drawer/ledger/glance → appears in the Planner card;
  duplicate add shows "On plan ✓" (gateway 409).
- Mark observed → moves to history with a date; re-add works; notes persist.

**Target Panel + guided observe (Feature 1.5)**
- Click any object anywhere → lands on `/tonight/:id` (cold-load the URL too).
- Start Observing with **no telescope** → highlights the Telescope card; with
  a telescope but **no phone** → highlights Sync; when paired → alignment
  opens already tracking. (Final paired stage needs a **real phone** to fully
  confirm — verified only to the pairing step.)

**Science surfacing (Feature 3)**
- Ledger: sort "Sets" ascending = soonest-setting first; <2h rows orange.
- ISS card: next pass matches `curl /satellites/passes`; countdown chip
  appears within 3h.

**Auth UX (Feature 2)** — needs SMTP configured to receive real emails; the
loop is otherwise testable with DB-generated tokens:
- Forgot → generic success for any email (no enumeration).
- Reset with a valid token → password changed + auto-login; old password
  rejected; token single-use (reuse → 400).
- Verify page redeems the token, shows "Email verified", and a waiting
  signup tab advances by itself.

**Profiles (Feature 4)**
- Edit display name/bio → Save persists; avatar upload/clear works.
- `/observers/:username`: public shows no email/coordinates; **private → 404**
  for anonymous but **owner → 200**; observers-only → 403 anonymous;
  unknown → 404.
- Setting a location populates the city/region label (Nominatim).

## Known caveats / environment traps

- **Backend has no hot-reload** — test engine/gateway changes on a throwaway
  port and restart the real servers to pick up changes.
- **Port conflict:** the portfolio project's dev server squats 5173/5174; if
  the preview serves the portfolio, skyguide's Vite is on another port.
- **Screenshots time out** when the browser pane is hidden (the `Starfield`
  WebGL canvas) — verify via DOM reads / API calls instead.
- Guided-observe final stage and all email delivery are the two things not
  fully exercised end-to-end (need a real phone and SMTP respectively).

---

# What's Committed vs Pending

- Features 2 + 3 were committed and opened as
  **[PR #1](https://github.com/watermelon588/skyguide-ai/pull/1)**
  (`feature/auth-ux-and-science-surfacing`).
- Feature 4 (profiles) is **built and verified but not yet committed** at the
  time of writing.
- The full roadmap lives in `UPCOMING_FEATURES.md`; session-by-session notes
  live in the assistant's project memory.

---

# Next

Per `UPCOMING_FEATURES.md`, the queue continues with **Feature 5 (First Light
Guide)** and **Feature 6 (Community: nearby observers + location chat rooms)**
— the latter now unblocked because profiles + privacy exist. Later systems
(Notifications, AI Recommendation Engine) depend on the planner history and
profiles shipped today as their fuel.
