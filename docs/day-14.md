# DAY-14

# 🌌 SkyGuide AI — Day 14 Implementation Report

> **Focus:** The phone becomes an instrument. Until today the mobile side of a
> pairing session was a status card that streamed sensors and showed nothing
> back. Day 14 gives it a **dedicated lightweight app** — its own entry point,
> its own install-to-home-screen identity, and, most importantly, **live
> observation guidance on the phone itself**, because the phone is mounted on
> the telescope and the laptop is three steps away in the dark.
>
> Date: 2026-07-17
>
> Scope: one feature in four movements — (1) a second Vite entry (`align.html`)
> so the phone stops downloading the SPA, (2) a PWA manifest + icons for the
> "app without an app store" experience, (3) the on-phone guidance screen fed
> by the alignment engine (one gateway line changed), and (4) the UX repairs
> the old `/align` flow needed: screen wake lock, a full-screen sensor
> permission step, honest recovery states.

---

# Part 0 — The decision: native app vs. restricted web

The request started as *"can we make a very lightweight app for the phone,
or restrict the browser to just connection + streaming + guidance?"* Two
findings shaped the answer:

1. **The restriction already exists — by authentication, not by trust.** The
   phone never logs in. The QR hands it a `room` + a short-lived pairing JWT
   that authenticates the *socket only*. Every product page (`/dashboard`,
   `/tonight`, `/explore`, …) sits behind `ProtectedRoute` + cookie auth, so a
   phone that typed `/dashboard` would just meet the login page. Nothing to
   build.

2. **The real problem was weight.** `Align` was an eager import in `App.jsx`,
   so the worst-connected client in the system — a phone on cellular next to a
   telescope — downloaded the entire SPA shell (react-router, framer-motion,
   the chat stack, the icon pack… ~1 MB+ of JS) to render one card.

A native app was rejected: `DeviceOrientationEvent` in the mobile browser
already powers the whole sensor pipeline (Day 12–13 of the engine work), the
QR → URL flow has zero install friction, and the project spec pins the mobile
companion as a PWA. Native only pays off for background sensing or raw
high-rate magnetometer access — neither is needed.

**The shape chosen:** a second Vite entry, installable as a PWA, sharing the
session-critical modules (PairingContext, the orientation stream, the socket
service) with the main app but none of its UI chrome.

---

# Part 1 — `align.html`: the companion as its own bundle

## 1.1 Entry + build wiring

- `frontend/align.html` — a real second HTML entry (mobile viewport with
  `viewport-fit=cover`, black `theme-color`, manifest + apple-touch-icon
  links, `apple-mobile-web-app-*` metas for full-screen iOS).
- `vite.config.js` — `build.rollupOptions.input` now lists both `index.html`
  and `align.html`.
- `src/align/main.jsx` — the companion root. It mounts **only**
  `SocketProvider` + `CompanionApp`. No router, no QueryClient, no
  AuthContext, no ChatProvider, no framer-motion, no GSAP.

The QR (in `QRCodeModal.buildPairingUrl`) now encodes
`/align.html?room=…&token=…`. The legacy SPA route `/align` was reduced to a
`window.location.replace("/align.html" + search)` forwarder so QR codes from
before today still work. (A pleasant discovery: **Vite's dev-server HTML
fallback resolves `/align` to `align.html` directly**, so in dev the redirect
never even runs; it exists for production hosts that don't do that rewrite.)

## 1.2 What the phone downloads now (measured)

Tracing `dist/align.html`'s full import graph after the build:

| | before (SPA shell) | after (companion) |
|---|---|---|
| static JS | ~1 MB+ raw | **260 KB raw / ~80 KB gz** |
| what's in it | react-dom, router, framer-motion, GSAP hooks, chat stack, icon pack, axios… | react-dom + socket.io-client + ~23 KB of companion code |

react-dom + socket.io-client is the floor — everything above it was removed.
CSS is the shared Tailwind build (~13 KB gz) and the Satoshi variable font is
42 KB, both cached after first load.

## 1.3 Two bundle traps worth recording

These are the reason the number above is 80 KB and not 190 KB:

- **`react-icons/fi` fuses into the shared vendor chunk.** The first build
  had the companion importing eleven Feather icons from `react-icons/fi`;
  rolldown merged the icon pack into the vendor chunk *both entries share*,
  and the phone was suddenly downloading ~90 KB gz of desktop-app icons. Fix:
  `src/align/icons.jsx` — the eleven glyphs hand-inlined as SVG components
  (same 24×24 feather geometry, visually identical). The icon pack then fell
  out of the companion's graph entirely.
- **PairingContext's static `createRoom` import dragged axios in.**
  `createRoom` is a dashboard-only code path (the phone never creates rooms),
  but a static import is a static edge. It's now a dynamic
  `await import("../services/alignment.service")` inside
  `createPairingSession()` — behavior identical for the dashboard (the
  function was already async), axios gone from the phone bundle.

Rule of thumb going forward: **anything imported by PairingContext,
useOrientationStream, or socket.service lands on the phone.** Check
`dist/align.html`'s graph after touching shared files.

---

# Part 2 — The PWA: install without an app store

- `public/companion.webmanifest` — `name: SkyGuide Companion`,
  `start_url: /align.html`, `scope: /align`, `display: standalone`,
  `orientation: portrait`, black background/theme.
- `public/icons/companion-{512,192,180}.png` — the brand crosshair (square
  reticle, hard corners, electric blue on black) generated by a small numpy
  script with a hand-rolled PNG encoder (the astro-engine venv has no Pillow;
  it does have numpy + zlib, which is all a PNG needs). 512 + 192 for the
  manifest (`any` + `maskable`), 180 as `apple-touch-icon`.
- **Deliberately no service worker.** Chrome and iOS both install fine
  without one now, and an offline shell is meaningless for a tool whose whole
  job is a live socket — a cached page that can't pair is worse than a
  browser error.

Result: scan QR → "Add to Home Screen" → the companion reopens full-screen,
portrait-locked, with its own icon. The `scope: /align` keeps the installed
app from swallowing the rest of the site if a link ever escapes.

---

# Part 3 — Guidance on the phone

## 3.1 One gateway line

The alignment engine already broadcast `alignment:target` and
`alignment:state` to the whole room, but the ≤10 Hz `alignment:update` stream
went out `socket.to(roomId)` — *everyone except the sender*, and the sender
of an orientation packet is the phone. The fix in
`sockets/alignmentEngineSocket.js` is `io.to(roomId)`: the phone now hears
the same enriched packets the dashboard renders.

Two disciplines survive untouched: the emit stays **reliable, never
volatile** (the Day-14-of-engine trap: sensorSocket's volatile relay of the
same inbound event leaves the transport busy in the same tick, and a volatile
packet there is dropped 100 % of the time), and `alignment:set_target` /
`clear_target` remain **dashboard-role only** — the phone is a read-only
consumer of guidance, never a controller.

## 3.2 `useAlignmentGuide` — the read-only sibling of `useAlignmentFeed`

Same ref-buffer discipline as the dashboard hook: packets land in a ref, a
150 ms interval commits to React, a 2.5 s staleness window (matched to the
engine's lost-stream sweeper) turns a silent link into an explicit "signal
lost" instead of a frozen arrow. No `setTarget`/`clearTarget` — the hook
can't do what the role can't.

## 3.3 `GuideScreen` — designed for a phone strapped to a telescope

Big type, one instruction per axis, readable at arm's length in the dark:

- **Target strip** — "Guiding to Orion Nebula" + a state chip
  (Searching → Close → Almost there → **Locked**, plus Below horizon /
  Signal lost).
- **The number** — angular error in a 7xl display font, with a closeness bar
  underneath (30° = empty, lock threshold = full).
- **Two direction tiles** — *Rotate right 7.9°* / *Tilt up 2.8°*, chevron
  arrows, following the engine's sign convention (positive horizontal error =
  rotate clockwise; positive vertical = raise the tube).
- **Locked** — the working UI is replaced by a green-bordered "On target —
  … is in your eyepiece" hold screen.
- **Confidence < 30** — a calibration hint ("sweep the phone in a figure-8"),
  because low confidence means *the compass has no north reference*, not
  *the sensor is broken*.
- **No target yet** — a "Streaming" screen with the phone's own live
  heading/pitch readout, telling the user to pick a target on the dashboard.
- **Footer** — streaming indicator (20 Hz / Paused), live H/P digest, room id.

## 3.4 The rest of the flow, repaired

The old `/align` experience was the source of the "flow was not good"
feedback. What changed:

- **Screen Wake Lock** (`useWakeLock`) — the biggest fix. The phone's screen
  used to sleep mid-session, which backgrounds the page and stops the sensor
  stream; the session appeared to randomly drop. The lock is requested while
  paired and re-acquired on every `visibilitychange` (the OS releases it on
  background). Unsupported browsers no-op.
- **Sensor permission is a full-screen step** (`SensorGate`) — previously a
  small card below the fold; iOS requires a user gesture for
  `requestPermission()`, so the tap is unavoidable — now it's one giant
  button ("One last step → Enable motion sensors") with explicit
  denied / insecure-context / unsupported recovery screens.
- **Honest status screens** (`StatusScreen`) — connecting, authenticating,
  reconnecting, session expired, session ended, and a proper "Scan to pair"
  explainer when the page is opened without QR params. Each failure state
  says exactly how to recover (rescan, regenerate, etc.).
- CSS transitions only — the companion carries no motion library.

Deleted as superseded: `components/alignment/{PairingStatus,
SensorPermissionPanel, SensorStreamIndicator}.jsx` (their only consumer was
the old Align page). `ConnectionIndicator` stays — the workspace and QR modal
use it.

---

# Part 4 — Verification

- **Build:** both entries compile; companion graph traced and measured (the
  numbers in 1.2).
- **Gateway:** `npm test` — 12/12 pass with the `io.to` change.
- **Lint:** the two flags on new/touched files are the same two patterns the
  codebase already carries everywhere (`set-state-in-effect` in the feed
  hooks, `react-refresh/only-export-components` on context files) — verified
  by linting the pre-change files.
- **Live flow, via the throwaway-stack recipe:** a stub socket.io gateway on
  5055 (needs `NODE_PATH=server-gateway/node_modules` when run from a temp
  dir) fabricating the pairing handshake and walking `alignment:update`
  through searching → close → nearly_aligned → locked, plus the
  `frontend-teststack` launch config pointing the app at it. Verified at
  375×812 in the pane: invalid-QR screen, session-expired screen (dead
  gateway), pairing → "Guiding to Orion Nebula / Close / 8.4° / rotate right
  7.9° / tilt up 2.8°" → "Locked / On target". Manifest + all three icons
  serve with correct content types. `/align` (old QR shape) lands on the
  companion.
- **Known pane limits:** screenshots freeze when the pane is hidden (the
  long-standing rAF freeze), so proof is the rendered accessibility tree; and
  the footer reads "Paused" in the pane because a hidden page *is*
  backgrounded — on a real phone it reads "Streaming 20 Hz".

---

# How to test it for real

1. Start gateway + frontend (tunnel mode for iOS — sensors require HTTPS).
2. Dashboard → **Sync telescope** → scan the QR with the phone camera.
3. Phone: one screen, one button — **Enable motion sensors** → "Streaming".
4. Dashboard: pick a target → arrows appear on the phone instantly; move the
   phone until the green **On target** screen.
5. Phone browser menu → **Add to Home Screen** → reopens standalone,
   portrait, black status bar, SkyGuide icon.

Expected edge cases:

- QR expired / token garbage → "Session expired" with the rescan hint.
- Dashboard hits Disconnect → phone shows "Session ended" (terminal).
- Target sets below the horizon → "Below the horizon" notice, not arrows.
- Phone locked/backgrounded → stream stops (by design), wake lock prevents
  it happening *by itself*; on return the stream re-arms.
- Opening `/align.html` with no params → the "Scan to pair" explainer.

---

# Files touched (Day 14)

**Frontend (frontend/src) — new:** `align/main.jsx`, `align/CompanionApp.jsx`,
`align/StatusScreen.jsx`, `align/SensorGate.jsx`, `align/GuideScreen.jsx`,
`align/useAlignmentGuide.js`, `align/useWakeLock.js`, `align/icons.jsx`.
**Modified:** `pages/Align.jsx` (→ redirect), `context/PairingContext.jsx`
(lazy `createRoom`), `components/dashboard/QRCodeModal.jsx` (QR URL).
**Deleted:** `components/alignment/{PairingStatus, SensorPermissionPanel,
SensorStreamIndicator}.jsx`.

**Frontend (root):** `align.html` (new), `vite.config.js` (second input),
`public/companion.webmanifest` (new), `public/icons/companion-{512,192,180}.png`
(new).

**Gateway (server-gateway/src):** `sockets/alignmentEngineSocket.js`
(`io.to` for `alignment:update` + comments).

**Docs:** `WEBSOCKET_PROTOCOL.md` (`alignment:update` audience).

---

# Deferred, deliberately

- **Night-vision mode** — a red dim theme on the companion is standard in
  astronomy tooling (preserves dark adaptation) but introduces a second
  saturated hue, which is a design-system decision, not a slip-it-in.
- **Phone-side target picking** — the phone stays read-only; choosing targets
  is dashboard-role by engine contract, and that separation has served well.

---

*Day 14 in one line: the phone stopped being a sensor with a status page and
became the instrument you actually look at.*
