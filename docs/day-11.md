# DAY-11

# 🌌 SkyGuide AI — Day 11 Implementation Report

> **Focus:** Closing the gap between "the engine works" and "the product is
> usable" — alignment becomes a real page, discovery gets a map, and location
> stops asking people to know their own latitude.
>
> Date: 2026-07-15
>
> Scope: a structural fix to the pairing session's mount point, the new
> `/alignment` workspace, a one-click observe path, the community observer map,
> an observer-location picker, a genuine Refresh GPS bug fix, and app-wide
> scrollbar removal.

---

# Overview

Day 10 gave the product its look. Day 11 is about the **paths through it** —
the places where a working engine still made a person do the work.

Eight user-reported items, which resolve into four arcs:

1. **Alignment becomes a route** — the "Alignment" button was broken by
   construction; fixing it properly meant lifting the pairing session out of the
   Dashboard, which in turn unlocked the two-column `/alignment` workspace the
   overlay could never be.
2. **One click to guidance** — "Start observing" now goes straight to a guided
   telescope; nobody types a catalog id ever again.
3. **Community map** — observers plotted on a MapLibre/CARTO dark map, on
   coarse cell centres that cannot be traced back to an address.
4. **Location without coordinates** — a place type-ahead, a timezone picker, and
   the real reason Refresh GPS "did nothing".

```
PairingProvider lifted (PairedRoutes)
        │
        ├──▶ /alignment workspace ──▶ click-to-track ──▶ Start observing (1 click)
        │
        └──▶ (unblocks nothing else — but nothing else could ship without it)

Community map ── geohash-4 cell centre ── new API boundary
Location picker ── Nominatim forward geocode ── Refresh GPS fix
Scrollbars ── global
```

**Hard constraint honoured:** the request was "do not break anything, just UI
related changes." Two items could not be done inside that constraint; both are
called out explicitly in *Deviations* below, with the reasoning.

---

# Part 1 — The Alignment Button (the bug that started it)

## 1.1 What was wrong

`WelcomeHeader.jsx:138` did:

```js
onClick={() => navigate("/align")}
```

`/align` is the **phone companion page**. It reads `?room=` and `?token=` from
the QR code, validates their shape, and renders `InvalidSessionView` when they
are missing:

```js
const validFormat = room.trim().length > 0 && JWT_SHAPE.test(token);
...
{validFormat ? <AlignPairingProvider .../> : <InvalidSessionView />}
```

A desktop click has no room and no token, so the page did exactly what it was
written to do: **"Invalid Session", 100% of the time.** Nothing was expired,
nothing was misconfigured. The button pointed at the wrong surface.

`Footer.jsx` carried the same `{ label: "Telescope alignment", to: "/align" }`.

## 1.2 The fix

Both now point at `/alignment` — a new desktop route (Part 2). `/align` is
untouched and remains the phone's page.

| Before | After |
|---|---|
| `navigate("/align")` → Invalid Session | `navigate("/alignment")` → the workspace (or a gate explaining what's missing) |

**Verified live:** clicking the button lands on `/alignment` and renders
*"No phone paired — your phone is the guidance sensor… Pair it from the
dashboard to begin"* with a `Sync telescope` CTA. `Invalid Session` no longer
appears.

---

# Part 2 — `/alignment`: the workspace

## 2.1 The blocker: where the pairing socket lived

Alignment Mode was a full-screen portal overlay, **not** a route. That was not
an aesthetic choice — `PairingProvider` was mounted *inside* `Dashboard.jsx`:

```jsx
export default function Dashboard() {
  return (
    <PairingProvider>
      <DashboardInner />
    </PairingProvider>
  );
}
```

Navigating anywhere unmounted the provider, which tore down the socket and
unpaired the phone. The Session-15 code says so in a comment, and the project
memory recorded it as a rule: *"Don't promote it to a route without first
lifting the provider."*

So that is what Day 11 did.

## 2.2 `PairedRoutes` — one session for the whole app

**New:** `frontend/src/layouts/PairedRoutes.jsx` — a **layout route** that owns
the pairing session above every authenticated page:

```jsx
<Route element={<ProtectedRoute><PairedRoutes /></ProtectedRoute>}>
  <Route path="/dashboard"      element={<AppLayout><Dashboard /></AppLayout>} />
  <Route path="/alignment"      element={<AppLayout><AlignmentWorkspace /></AppLayout>} />
  <Route path="/tonight"        element={<Tonight />} />
  <Route path="/tonight/:id"    element={<TargetPanel />} />
  <Route path="/profile"        element={<AppLayout><Profile /></AppLayout>} />
  <Route path="/community"      element={<AppLayout><Community /></AppLayout>} />
  <Route path="/community/chat" element={<AppLayout><CommunityChat /></AppLayout>} />
</Route>
```

- **Same provider, same socket code** — mounted higher. Nothing about the
  pairing state machine, the reducer, or the socket lifecycle changed.
- **Zero cost when idle:** `usePairingChannel` opens no socket until a session
  actually has a `roomId` + `pairingToken`.
- **`/align` is deliberately excluded.** The phone mounts its own
  `AlignPairingProvider`; putting it under this group would nest two providers
  for the two ends of the same room.

## 2.3 The hand-off

`PairedRoutes` also mounts `PairingHandoff`, which answers *"the moment they're
connected to their phone, the user is redirected to alignment"*:

```js
const justConnected = connected && !wasConnected.current;   // TRANSITION only
if (!justConnected) return;
if (location.pathname !== HANDOFF_FROM) return;             // /dashboard only
const observe = new URLSearchParams(location.search).get("observe");
setTimeout(() => navigate(observe ? `/alignment?target=${observe}` : "/alignment",
                          { replace: true }), HANDOFF_DELAY_MS);
```

Three deliberate details:

| Detail | Why |
|---|---|
| Fires on the **transition** into `connected` (ref-guarded) | Re-entering `/dashboard` while already paired must not bounce the user straight back out |
| **`/dashboard` only** | A reconnect while reading `/community` shouldn't yank the page away |
| **1100 ms delay** | The QR modal auto-dismisses at 900 ms (`SUCCESS_DISMISS_MS`). Leaving just after means the user *sees pairing succeed*, then arrives — rather than the screen changing out from under the scan |

Any pending `?observe=` rides along as `?target=`, which is the thread that makes
Part 3 work.

## 2.4 Layout — one column, then two

The complaint was: *"for searching the target the 3d visual guide window is
taking the entire screen, which is not relevant."* Correct — a starfield at
100vw told the user nothing the numbers weren't saying better, and it's a poor
place to read a quaternion.

**`pages/AlignmentWorkspace.jsx`** — layout follows the work:

```jsx
<div className={`grid items-start gap-4 ${hasTarget ? "lg:grid-cols-2" : "grid-cols-1"}`}>
  <div className="flex min-w-0 flex-col gap-4">
    <SessionPanel />      {/* websocket + device telemetry */}
    <OrientationPanel />  {/* the Orientation Engine   */}
    <EnginePanel />       {/* the Alignment Engine     */}
    <TargetPicker />      {/* tonight's targets        */}
  </div>
  {hasTarget && <GuideViewport ... />}   {/* the guide only when there's something to guide to */}
</div>
```

**The guide only earns half the screen once a target exists.**

## 2.5 The panels

**New:** `frontend/src/components/alignment-workspace/`

| File | Role |
|---|---|
| `Panel.jsx` | Shared shell (`Panel`, `Field`, `BigField`) — flat surface + hairline, radius 0 |
| `format.js` | `fmt()` — its own module so component files export only components (react-refresh) |
| `SessionPanel.jsx` | Room, socket id, transport, device, paired-at, live uptime (1 Hz tick), Disconnect |
| `OrientationPanel.jsx` | Heading/pitch/roll, confidence, calibration, north ref, rates, quaternion |
| `EnginePanel.jsx` | Angular error, target alt/az, confidence, ephemeris age, packet seq |
| `TargetPicker.jsx` | Tonight's ranked targets as clickable cards |
| `GuideViewport.jsx` | The visual guide, sized to a column (+ expand to full-bleed) |

`EnginePanel` restores the Session-14 numeric readout as a first-class panel.
Session 15 had banished it to an opt-in telemetry corner because the overlay was
an immersive scene with no room for numbers; the workspace has a column for
exactly this, so the engine gets to speak plainly again. It also translates the
sign convention into English rather than making the reader remember it:

```js
// "3.40° clockwise" reads; "+3.4°" needs a decoder ring.
return `${Math.abs(v).toFixed(2)}° ${v > 0 ? "clockwise" : "anticlockwise"}`;
```

## 2.6 `useGuidanceScene` — one brain, two surfaces

The overlay still exists for the DEV-only `/align-lab` simulator, and the new
column paints the same scene. Rather than duplicate ~90 lines of phase/edge/copy
derivation (which `CLAUDE.md` forbids: *"Never duplicate logic"*), it was
**extracted**:

**New:** `components/alignment-mode/useGuidanceScene.js` — owns the phase ladder,
`deriveEdge`, the canvas `modeRef`, the copy line, the aria-live announcements,
the lock haptic, and the below-horizon dismissal.

Both `AlignmentMode.jsx` (overlay) and `GuideViewport.jsx` (column) consume it,
so phase, edge state and copy **cannot diverge**. Zero science moved: every value
still arrives pre-computed from the backend engine via `useAlignmentFeed`.

## 2.7 What left the dashboard

**Deleted:**

- `components/dashboard/AlignmentPanelCard.jsx`
- `components/dashboard/OrientationPanelCard.jsx`

The dashboard keeps `SyncTelescopeCard` (the QR scan is a *setup* step) and gains
a small `AlignmentLink` signpost once paired. The split is
**planning vs instrumentation**: the dashboard decides *what* to observe, the
workspace *aims at it*.

## 2.8 A latent bug fixed on the way

`Dashboard.jsx` did:

```js
const pairing = usePairing();          // returns { pairing, socketRef, ... }
const paired = pairing.status === "connected";   // ← always undefined
```

`pairing.status` was **always `undefined`**, so `paired` was permanently `false`
and the guided observe flow could never reach its `launch` stage. Now
`const { pairing } = usePairing();`.

---

# Part 3 — One click from "interesting" to "guiding"

> *"user cannot put targets manually everytime… the system will instantly start
> guiding cutting down the hardship of putting target name into the target
> field"*

## 3.1 Start observing takes the shortest path

`TargetHero` previously always routed through the dashboard's setup walk. Now:

```js
const paired = pairing.status === "connected";
navigate(paired
  ? `/alignment?target=${target.catalog_id}`     // nothing left to set up
  : `/dashboard?observe=${target.catalog_id}`);  // walk telescope → pairing first
```

Already paired → **straight to guidance, target pre-set.** Not paired → the
dashboard runs setup, then `PairingHandoff` (2.3) carries the target through
automatically. Either way the user never types an id.

`AlignmentWorkspace` consumes `?target=` once, ref-guarded, and clears it from
the URL so a refresh can't silently re-aim a target the user has since changed:

```js
if (!requestedTarget || !feed.paired) return;
if (launchedRef.current === requestedTarget) return;
launchedRef.current = requestedTarget;
feed.setTarget(requestedTarget);
setSearchParams({}, { replace: true });
```

## 3.2 Click-to-track replaces the text field

The overlay's free-text field asked the user to already know the answer and
punished a typo with `TARGET_NOT_FOUND`:

```
placeholder="Search the catalog — M13, M104…"
```

`TargetPicker` instead lists **tonight's live, engine-ranked, above-horizon
targets** from `useTonight` — the same list the dashboard and `/tonight` show —
so **every card is guaranteed to resolve.** A click is still
`feed.setTarget(catalogId)` → `alignment:set_target`; resolution stays
backend-side, exactly as before.

The typed field survives **only** in `/align-lab`, where it's legitimate test
scaffolding for a dev harness.

---

# Part 4 — The Community Map

> *"beautiful map which match the website vibe to show all community user
> location (not exact location!)"*

## 4.1 The problem: there were no coordinates to plot

`communityService.findNearby` deliberately returned none, and said so:

```js
// Exact coordinates and precise distances NEVER leave this boundary — callers
// get a coarse distance *band* ("~15 km away") and the city/region label…
```

A map needs *something*. Three options were weighed; the chosen one is the only
non-invertible one.

| Option | Verdict |
|---|---|
| **Geohash-4 cell centre** ✅ | Deterministic. Everyone in a ~39×20 km cell gets a **byte-identical** pin. Reuses the cell already stored for regional chat rooms. |
| Random jitter (±2–5 km) | ❌ **Invertible.** Poll repeatedly and the noise averages out to the true point. Weaker than what the code already promised. |
| Round to ~0.1° | Non-invertible, but adds a *second* fuzzing scheme beside the geohash one already in the codebase. |

**The property that matters:** there is no noise to average away, so polling the
endpoint a thousand times reveals exactly what polling it once does.

## 4.2 `geohash.decodeCenter` (new)

`utils/geohash.js` only had `encode`. Added the exact inverse of its
bit-interleave:

```js
function decodeCenter(hash) { /* … */ return { latitude: (latMin+latMax)/2,
                                               longitude: (lonMin+lonMax)/2 }; }
```

**Verified** (round-trip against 5 world cities):

```
Kolkata  tunb -> 22.5879,88.4180 | displaced  5.8km
London   gcpv -> 51.5918,-0.1758 | displaced 10.0km
Leh      twp4 -> 34.1895,77.5195 | displaced  6.7km
Sydney   r3gx -> -33.8379,151.3477 | displaced 13.2km
Quito    6rbn -> -0.2637,-78.5742 | displaced 15.0km

worst displacement: 15.0 km  (cell ~39×20km → ≤~22km expected)
two nearby observers share a pin: true
malformed input -> null null null
```

## 4.3 The new API boundary

`findNearby` now returns, per observer, `approx` (their cell centre) and, once,
`center` (the **viewer's own** cell centre — the map anchor, given the same
treatment, because the response must never contain a precise fix).

`location` / `geohash4` are projected in the `$geoNear` pipeline, but are still
dropped in the `.map()` — **the boundary is what leaves the function**, exactly
as `distanceMeters` already worked. Observers predating `geohash4` get it
computed on the fly (no DB write), so a legacy account still appears.

## 4.4 Implementation

mapcn.dev is **MapLibre GL + CARTO tiles + shadcn/ui** under the hood. The
engine and tiles were adopted; the shadcn layer was **not**.

**Why not run `npx shadcn add @mapcn/map`:** it pulls shadcn's `Card` and its
`--accent` / `--background` CSS variables, which collide with the Bento/Blue
palette (a trap already recorded from Day 10's redesign). `components.json` has
`tsx: false`, but `components/ui/` is hand-written (Button/Dropdown/Toggle), not
a shadcn install — so the generated component would have been the odd one out.
Written in project idiom instead: flat surfaces, hairlines, radius 0, blue accent.

| File | Role |
|---|---|
| `components/community/mapStyle.js` | CARTO `dark_nolabels` **raster** tiles — free, no API key |
| `components/community/ObserverMap.jsx` | The map: pins, grouping, radius circle, legend |

- **`dark_nolabels`**, not the labelled variant: the canvas is pure black and
  CARTO's label typography isn't Satoshi — place names would read as someone
  else's design leaking in. Context comes from the pins and the cards.
- Raster over vector: a vector style is ~30 KB of JSON plus glyph/sprite fetches,
  and all that's needed is a dim backdrop behind our own pins.
- Basemap knocked back (`raster-opacity: 0.72`, `raster-saturation: -0.3`) so the
  accent pins are the brightest thing on it — **the map is context, the observers
  are the content.**
- **Attribution is required** by CARTO + OSM and is rendered by MapLibre's own
  control. Do not remove it.
- **Lazy-loaded** — MapLibre is ~1 MB nobody needs until they reach `/community`:

```
dist/assets/ObserverMap-*.js   1,032.53 kB │ gzip: 274.85 kB   ← its own chunk
```

- Pins **group by shared cell** and render a count — both the truthful rendering
  and the reason the map can't find anyone's house. Clicking a pin scrolls to
  that observer's card.
- Returns `null` on no-WebGL / dead tiles / no centre: **no map is better than a
  broken one**, and the grid below carries the same information.
- WebGL is checked up-front via `useState(webglAvailable)` rather than a
  try/catch inside the effect — the `react-hooks/set-state-in-effect` rule
  forbids the latter, and a render decision is the honest shape anyway.

---

# Part 5 — Observer Location

## 5.1 Pick a place, don't type a latitude

> *"dropdown menu to select location if the user wants to give location input
> manually… instead of giving lat long"*

The manual escape hatch asked for two numbers almost nobody knows. It now asks
for the thing they *do* know — the name of where they are.

**Gateway:** `utils/geocode.js` gained `searchPlaces(query)` beside the existing
`reverseGeocode`, sharing a new `getJson()` helper (the reverse path was
refactored onto it and **regression-checked**). New route:

```
GET /api/v1/users/location/search?q=…      (protect)
```

Auth-gated even though the data is public, so the gateway isn't an open proxy
onto Nominatim — whose usage policy we'd be answering for.

**Frontend:** `components/dashboard/PlaceSearch.jsx` — type-ahead, **debounced
350 ms** with an `AbortController` (Nominatim allows ~1 req/sec; a
keystroke-per-request would blow through it, and aborting means a superseded
keystroke can't land after a newer one and repaint stale results).

`ManualLocationModal` is now **search-first**, with the raw coordinate fields
behind an "Enter coordinates instead" disclosure — astronomers with a surveyed
pad or an unnamed dark-sky site genuinely want them. A coordinate validation
error force-opens the disclosure (an error nobody can see is not an error).

## 5.2 Timezone became a real dropdown

`components/dashboard/TimezoneSelect.jsx` — a **filterable** list from
`Intl.supportedValuesOf("timeZone")`, so it can never drift from what `Intl`
will accept, showing each zone's live offset (`GMT+5:30`). The old field was
free text validated against `Intl` — meaning the user had to already know
`Asia/Kolkata` is spelled exactly that way, and a typo was the only feedback.
~400 zones is too many to scroll, hence the filter (the shared `ui/Dropdown` has
none, so this is local rather than bending that one for a single call site).

**Nominatim returns no timezone.** The browser's is therefore a *default only* —
it never overwrites a user's choice. Right for someone observing locally, wrong
for someone planning a trip abroad, and silently replacing their pick would be
worse than leaving it.

## 5.3 Refresh GPS — the actual bug

`useGeolocation.js` was, in full:

```js
export async function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });
}
```

**Three failure modes, no guards:**

1. **On a non-secure origin, `navigator.geolocation` is `undefined`.** This app
   supports LAN mode (`http://192.168.x.x:5173`) *for phone pairing* — so this
   is a real configuration, not a hypothetical. It threw a raw
   `TypeError: Cannot read properties of undefined`, which told the user nothing.
2. **`enableHighAccuracy: true`** asks a desktop with no GPS radio to do
   something it cannot, and frequently just times out.
3. **`maximumAge: 0`** forbids the cached fix, which is the fast path desktops
   actually have.

And then `ObserverCard` **auto-cleared the error after 3.5 s** — so whatever went
wrong flashed by and the button returned to "Refresh GPS". *That* is why it read
as a button that does nothing.

**The fix:**

- Secure-context detection with an actionable message ("Location needs a secure
  connection. Open SkyGuide over HTTPS or on localhost").
- Try precise → **fall back to coarse** (`enableHighAccuracy: false`,
  `timeout: 20000`, `maximumAge: 120000` — a two-minute-old position is still the
  right city). A **permission denial is final** and is not retried; asking the OS
  the same question twice is not a strategy.
- Rejections always carry a `.code` (`GEO_ERROR`, matching
  `GeolocationPositionError` + an `UNSUPPORTED: 4` of our own) plus a human
  `.message`, so `useLocation` keeps switching on `code` as before.
- `ObserverCard` gained a persistent `GpsProblem` banner (Try again / Set
  manually / Dismiss). **Failures no longer auto-clear** — a location failure is
  not a toast. Success still fades on its own, because the coordinates above it
  visibly changed.
- The button label stays short ("GPS Failed"); the diagnosis goes in the banner
  where there's room to read it. Cramming `errorMessage` into a fixed-height
  no-wrap capsule truncated the one sentence that told the user what to do.

---

# Part 6 — Scrollbars

> *"get rid of all the scrollbar through the entire app. its visually annoying."*

`index.css` had a `.no-scrollbar` utility applied to a handful of containers.
It is now global:

```css
*, *::before, *::after { scrollbar-width: none; -ms-overflow-style: none; }
*::-webkit-scrollbar    { display: none; width: 0; height: 0; }
```

Applied to **every element**, not just `body`, so inner scroll containers —
modals, dropdowns, chat history, the catalog table — match. `.no-scrollbar` is
kept as an explicit opt-in marker for new containers (now a no-op against the
global rule, but it documents intent and survives any future scoping).

**Scrolling itself is untouched** — wheel, trackpad, touch, keyboard and
`scrollIntoView` all behave normally. Verified below.

---

# Deviations from "just UI changes"

The request was explicit, and two items could not honour it. Both were raised
and approved before implementation.

| Change | Why it was unavoidable |
|---|---|
| **`PairingProvider` lifted to `PairedRoutes`** | `/alignment` cannot exist as a route while the provider is mounted inside `Dashboard.jsx` — navigating to it would tear down the socket and unpair the phone. Same provider, same socket code, mounted higher. |
| **`findNearby` returns `approx` + `center`** | The API deliberately stripped every coordinate. A map had literally nothing to plot. |

Three decisions were put to the user before any code was written: the privacy
model (**geohash cell centre**), the install route (**maplibre-gl direct, project
idiom**), and the city-lookup source (**Nominatim via the gateway**). All three
recommendations were accepted.

---

# New Dependencies

| Package | Version | Why |
|---|---|---|
| `maplibre-gl` | ^5.24.0 | The map engine mapcn.dev is built on. Free CARTO tiles, no API key, no account. Lazy-loaded into its own chunk (only on `/community`). |

No backend dependencies: the geohash decoder is the in-house encoder's inverse
(~30 lines), and the forward geocode reuses the existing dependency-free
Nominatim client.

---

# Folder Changes

```
frontend/src/
  layouts/
    PairedRoutes.jsx                     ← NEW  pairing session + hand-off
  pages/
    AlignmentWorkspace.jsx               ← NEW  /alignment
  components/
    alignment-workspace/                 ← NEW  the whole directory
      Panel.jsx  format.js
      SessionPanel.jsx  OrientationPanel.jsx  EnginePanel.jsx
      TargetPicker.jsx  GuideViewport.jsx
    alignment-mode/
      useGuidanceScene.js                ← NEW  shared derivation
      AlignmentMode.jsx                  ← refactored onto the hook (lab-only now)
    community/
      ObserverMap.jsx  mapStyle.js       ← NEW
    dashboard/
      PlaceSearch.jsx  TimezoneSelect.jsx ← NEW
      AlignmentPanelCard.jsx             ← DELETED
      OrientationPanelCard.jsx           ← DELETED
      ObserverCard.jsx                   ← GpsProblem banner
      ManualLocationModal.jsx            ← search-first
    target/TargetHero.jsx                ← one-click observe
    Footer.jsx                           ← /align → /alignment
  hooks/
    useGeolocation.js                    ← rewritten (guards + fallback)
    useLocation.js                       ← surfaces coded messages
    useNearbyObservers.js                ← exposes center
  services/user.service.js               ← searchLocations()
  pages/{App,Dashboard,Community}.jsx    ← routes / provider / map
  index.css                              ← global scrollbar rule

server-gateway/src/
  utils/geohash.js                       ← decodeCenter()
  utils/geocode.js                       ← searchPlaces() + shared getJson()
  services/communityService.js           ← approxPoint(), approx + center
  controllers/userController.js          ← searchLocations
  routes/user.routes.js                  ← GET /location/search
```

*(The gateway also carries unrelated in-flight work on this branch —
`astroEngineClient.js`, `community.routes.js`, `sockets/index.js`,
`auth.routes.js` — not part of Day 11.)*

---

# Testing Requirements

## Prerequisites

1. Full stack from repo root: `npm run dev` (frontend 5173, gateway 5000,
   astro-engine 8000).
2. **Restart the gateway** after pulling — backend has no hot-reload.
3. A verified user with an observing location set. A phone for the pairing paths.

## The alignment button

- Dashboard → **Alignment** → lands on `/alignment`. **Must never show
  "Invalid Session"** (that string belongs to `/align`, the phone page).
- Footer → "Telescope alignment" → same.
- `/align` with no params **should still** show Invalid Session — that's correct.

## `/alignment` gates and layout

- No location → *"Set your observing location first"*.
- Not paired → *"No phone paired"*; mid-pairing → *"Waiting for your phone"*.
- Paired, no target → **one column**: Session / Orientation / Engine / Targets.
- Pick a target → **two columns**, guide on the right. Clear it → back to one.
- Expand/minimise the guide; Disconnect from `SessionPanel`.

## The hand-off (needs a phone)

- Dashboard → Sync Telescope → scan → *see the success beat*, then land on
  `/alignment` ~1.1 s later.
- Navigate `/alignment` → `/dashboard` → `/community` → back. **The phone must
  stay paired throughout** (this is the whole point of `PairedRoutes`).
- Re-entering `/dashboard` while already paired must **not** bounce you out.
- A reconnect while on `/community` must **not** yank you to `/alignment`.

## One-click observe

- `/tonight/M42` → **Start observing** while paired → straight to `/alignment`,
  M42 already tracking, `?target=` cleared from the URL.
- Same while **not** paired → `/dashboard?observe=M42` → walks telescope →
  pairing → then hands off with M42 still set.
- `TargetPicker` cards all resolve (no `TARGET_NOT_FOUND`).

## Community map

- `/community` shows the map above the grid; your cell as a ring, observers as
  counted pins; radius chips redraw the circle and re-zoom.
- **Two observers in one cell must share ONE pin showing "2"** — that's the
  privacy model working, not a rendering bug.
- Clicking a pin scrolls to that observer's card.
- Payload check: `GET /api/v1/community/nearby` must contain `approx`/`center`
  **and no raw coordinates, no email**.

## Location picker

- Edit → search "leh ladakh" → pick → lat/lng fill, banner confirms.
- Picking a result must **not** re-open the dropdown or fire a second search.
- Timezone filter ("kolkata", "utc"); Detect from browser.
- "Enter coordinates instead" still works; an invalid latitude force-opens it.

## Refresh GPS

- Happy path on `https`/localhost.
- **Deny permission** → warning banner persists (does not vanish after 3.5 s),
  offers *Set manually*, no *Try again* (a denial is final).
- **Open over LAN (`http://192.168.x.x:5173`)** → must say *"Location needs a
  secure connection…"*, **not** a raw TypeError. This is the regression that
  matters most.

## Scrollbars

- No scrollbar anywhere; long pages, modals, dropdowns, chat all still scroll.

## Regression

- `/align` (phone) unchanged; `/align-lab` still drives the overlay.
- Pairing, sensor stream and `alignment:*` events untouched.

---

# Verification Performed

Ran against a throwaway stack (frontend on 5176, a mock gateway on 5055) —
`VITE_API_LOCAL` was overridden via **process env**, since Vite's `loadEnv` lets
`process.env` win, so no `.env` file was touched and another session's dev server
was never disturbed.

**Passing:**

| Check | Result |
|---|---|
| Scrollbars | 0 px gutter on page **and** inner containers; `scrollTop` still sets to 50 → hidden, not disabled |
| Alignment button | → `/alignment`, renders the no-phone gate; **"Invalid Session" gone** |
| Dashboard cleanup | `Orientation Engine` / `Alignment Mode` cards absent; Observer + Sync + Alignment button present |
| Place search | "leh ladakh" → **Leh, Ladakh, India → 34.1718527, 77.5866776** through the real Nominatim |
| Timezone select | Renders `Asia/Kolkata GMT+5:30` |
| `geohash.decodeCenter` | Round-trips 5 world cities; same-cell observers share a pin; malformed → `null` |
| `reverseGeocode` | Still correct after the `getJson` refactor (regression) |
| `/align-lab` | Overlay + canvas + target select still work after the `useGuidanceScene` extraction |
| Lint | Same **18 pre-existing** problems, same files — **zero new** |
| Build | Passes; `ObserverMap` correctly isolated at 1,032 kB |

**A real bug found and fixed during verification:** picking a place **re-opened
the dropdown** — writing the chosen label into the input re-triggered the
debounced search. Proven from the network log (`q=Leh,+Ladakh,+India` fired on
the pre-fix run, absent after) and fixed with a `skipQueryRef`.

**NOT verified — needs a real browser:**

- **The map rendering.** The preview pane runs with `document.hidden`, which
  **freezes `requestAnimationFrame`**. MapLibre only fires `load` after its first
  paint, so it never completes there — no tiles, no markers, and *no error*.
  Confirmed environmental, not a code fault: a **minimal background-only style
  fails identically**, while a CARTO tile fetch and WebGL both succeed in that
  same pane.
- **The guide viewport's scene** — `AlignmentCanvas` pauses on `document.hidden`
  by design.
- **Every phone-dependent path** (hand-off, live telemetry, lock) — no phone.
- Anything needing the real DB: Atlas rejects this environment's IP, and seeding
  the shared production database for a UI task was **correctly refused by the
  sandbox and not pursued**. No test data was written anywhere.

## Environment traps confirmed this session

- **The preview pane is `document.hidden` → rAF is frozen.** Two consequences
  that look exactly like bugs in your own code:
  - **MapLibre never loads** (see above). Don't debug it.
  - **Framer Motion `AnimatePresence` exits never complete** — an exiting node
    stays in the DOM at `opacity: 0`. A dropdown that "won't close" may just be
    mid-exit; **check the inline style before believing it.** This produced one
    false positive here.
  - Verify via **DOM reads + network logs** instead — e.g. prove a debounce fix
    by *counting requests*, not by watching the UI.
- `computer type` still doesn't drive React controlled inputs — use `form_input`
  or the native setter + `input` event.
- Vite may pick its own fallback port; read the log rather than trusting the
  reported one.

---

# Decisions worth remembering

- **The pairing provider belongs above the routes, not inside a page.** Mounting
  a long-lived socket inside a page silently makes every future route a
  breaking change. `/alignment` was blocked on this for two sessions.
- **Cell centre, never jitter.** Random offsets *feel* private and are not:
  repeated polling averages them out. Determinism is the privacy property — same
  cell, same pin, byte for byte. **Never "improve" this by adding noise or
  raising precision.**
- **The guide earns the screen only when there's something to guide to.** A
  full-bleed starfield during target selection was decoration standing where
  information should be.
- **Don't make the user supply the primary key.** Typing `M104` and typing a
  latitude are the same failure: the interface demanding what the user came to
  find out. Both were replaced by picking.
- **A failure is not a toast.** Auto-clearing the GPS error after 3.5 s is what
  turned a diagnosable bug into "the button does nothing" — the single largest
  gap between the real defect and the reported symptom this session.
- **Adopt the engine, not the design system.** mapcn is MapLibre + CARTO +
  shadcn; the first two were worth taking, the third would have imported a
  competing palette into a finished one.
- **`/align` vs `/alignment` is one character from a support ticket.** The names
  are now distinct in purpose (phone vs desktop) but dangerously close in text —
  a future rename (`/companion`?) is worth considering.

---

# What's Committed vs Pending

- **Everything on Day 11 is uncommitted**, on `feature/user-profiles`, sharing
  the working tree with Day 10's redesign + community work and unrelated
  in-flight gateway changes (`astroEngineClient.js`, `community.routes.js`,
  `sockets/index.js`, `auth.routes.js`).
- Day 11 is separable into four commits: **(1)** `PairedRoutes` + `/alignment` +
  the button fix, **(2)** one-click observe + click-to-track, **(3)** the
  community map (frontend + the `approx`/`center` boundary), **(4)** the location
  picker + GPS fix + scrollbars.
- Session detail lives in project memory (`alignment-workspace`, `community-map`);
  `alignment-mode-ui`'s overlay-not-route rule is now **superseded** and marked so.

---

# Next

1. **Verify the map and the guide scene in a real browser** — the one gap this
   session couldn't close. Everything else was exercised.
2. **Live-test the hand-off with a phone** — the 1100 ms beat, the
   navigate-away-and-back survival, and target auto-set are the paths most worth
   watching a human do.
3. **Reconsider `/align` vs `/alignment`.** The bug fixed today came from those
   two names, and the trap is still loaded for the next person.
4. **Commit the tree.** It is now ~80 files across three days and two arcs.
5. Still open from Day 10: the **report review UI** (`Report` docs accumulate
   with `status: "open"` and nothing surfaces them; `role: "admin"` already
   exists to gate one).
