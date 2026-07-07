# SESSION_12_13_REPORT.md

# 🌌 SkyGuide AI — Sessions 12 & 13 Implementation Report

> **Phone Sensor Streaming Engine → Orientation & Calibration Engine**
>
> Date: 2026-07-07
>
> Scope: everything between "the phone can pair" and "the system knows,
> with confidence, which direction the phone is pointing."

---

# Overview

Two sessions were implemented and verified back-to-back, plus three
operational fixes discovered during real-device testing.

| # | Work | Outcome |
|---|------|---------|
| 1 | **Session 12** — Sensor Acquisition & Realtime Streaming Engine | Phone streams raw sensor packets to the dashboard at 20Hz over the existing pairing socket |
| 2 | **Fix** — LAN login failure (`ERR_CONNECTION_TIMED_OUT`) | Stale LAN IP in both `.env` files corrected |
| 3 | **Fix** — Gateway `EADDRINUSE` on port 5000 | Orphaned background gateway killed; port returned to the dev terminal |
| 4 | **Fix** — Misleading "unsupported" sensor state on HTTP origins | Capability check reordered: secure-context is tested first |
| 5 | **Session 13** — Orientation & Calibration Engine | Phone computes a stable, calibrated, device-independent orientation model on-device and streams only that |

The end state: **`orientation_update` is the single source of truth for
device orientation.** No future subsystem ever consumes a raw browser
sensor event.

---

# Part 1 — Session 12: Sensor Streaming Engine

## Architecture

```
PHONE (/align)                      GATEWAY                        DASHBOARD
sensor.service.js                   sensorSocket.js                useSensorFeed()*
(acquisition + permissions)         (role/room guards,             (stats in refs,
        │ 60Hz events → refs         verbatim relay)                4Hz UI commits)
useSensorStream()*                       │                              │
20Hz sample loop ── sensor_frame ──► socket.to(room) ── sensor_frame ─► SensorDiagnosticsCard*
lifecycle       ──  sensor_status ─►     volatile     ── sensor_status ─►
```

\* superseded in Session 13 (see Part 3) — the acquisition service and
gateway relay carry forward unchanged.

Strict layering: acquisition (pure JS) / streaming lifecycle (hook) /
transport (existing pairing socket) / UI. No astronomy, no math, no storage.

## Key decisions

- **One versioned packet, `sensor_frame` (v1)** carrying orientation +
  motion + screen groups; unavailable groups are `null`, never fabricated.
  `seq` enables drop detection; `t` is the phone clock.
- **Volatile emits** for frames (a late frame is worthless — the next one is
  50ms away); **reliable emits** for rare `sensor_status` transitions
  (`started` / `probed` / `background` / `stopped` / `permission_denied`).
- **Sampling decoupled from acquisition**: listeners write to refs at native
  rate (~60Hz); a 50ms loop snapshots and emits at exactly 20Hz.
- **No per-frame React state anywhere** — phone emits from refs, dashboard
  accumulates in refs and commits to state every 250ms (renders at 4Hz
  regardless of stream rate).
- **Security from `socket.data`, never the payload**: only sockets that
  passed the pairing JWT check *and* joined as `role === "phone"` may
  stream; relay never leaves the JWT-bound room; >2KB payloads dropped.
- **Permission handling**: iOS `requestPermission()` behind a user-gesture
  button; Android auto-grant with a 1.5s first-event probe that catches
  silently blocked sensors; explicit `denied` / `unsupported` /
  `insecure_context` UI states.
- **Reliability**: pause/resume on `visibilitychange` (phone sleep), re-arm
  after socket reconnect (keyed off `pairing.status`), strict effect
  cleanup — no duplicate listeners.

## Files (Session 12)

**Created**

| File | Responsibility |
|------|----------------|
| `server-gateway/src/sockets/sensorSocket.js` | Guarded volatile relay for sensor events |
| `frontend/src/services/sensor.service.js` | Capability detection, permission flows, listener lifecycle, latest-sample store |
| `frontend/src/hooks/useSensorStream.js` | Phone: permission machine + 20Hz emit loop *(deleted in S13)* |
| `frontend/src/hooks/useSensorFeed.js` | Dashboard: ref-backed stats + 4Hz commits *(deleted in S13)* |
| `frontend/src/components/alignment/SensorPermissionPanel.jsx` | Enable button + permission/unsupported/insecure states |
| `frontend/src/components/alignment/SensorStreamIndicator.jsx` | Phone-side live streaming status |
| `frontend/src/components/dashboard/SensorDiagnosticsCard.jsx` | Temporary raw diagnostics panel *(deleted in S13)* |

**Modified**

- `server-gateway/src/sockets/index.js` — register `sensorSocket(io)`
- `frontend/src/context/PairingContext.jsx` — expose the existing
  `socketRef` through context in **both** providers (stable ref, zero
  re-render cost); reducer and pairing events untouched
- `frontend/src/pages/Align.jsx`, `frontend/src/pages/Dashboard.jsx` — mount the new panels
- `WEBSOCKET_PROTOCOL.md` — `sensor_frame` / `sensor_status` documented

## Session 12 testing (measured results)

**Method:** real gateway + real `/align` page as the phone (Chrome preview,
synthetic `deviceorientationabsolute` / `devicemotion` events) + a headless
Node "dashboard" socket client joined to the same room, plus a second
**imposter** dashboard-role client attempting to stream.

| Check | Result |
|-------|--------|
| Pairing → `phone_connected` → `sensor_status: started` → `probed {orientation: true, motion: true}` | ✅ observed in order |
| Sustained stream rate | ✅ **~20.2Hz** (40 frames per 2s window) |
| Live values relayed | ✅ alpha sweep 297.5° → 328° → 359° → 29° …, gravity y = 9.7 |
| `seq` monotonic, drop detection | ✅ exactly 1 volatile drop detected via seq gap |
| Imposter dashboard-role `sensor_frame`/`sensor_status` | ✅ **dropped by role guard** (zero leakage) |
| Error path: malformed/expired token | ✅ "Session Expired" UI, sensor panel hidden, no crash, zero console errors |
| Production build (`vite build`) | ✅ pass |

---

# Part 2 — Operational fixes

## 2.1 LAN login failure

**Symptom:** `POST http://192.168.92.253:5000/api/v1/auth/login →
net::ERR_CONNECTION_TIMED_OUT`.

**Root cause:** the Wi-Fi network changed; the machine's LAN IP moved from
`192.168.92.253` to `192.168.194.253`. Both `.env` files (frontend
`VITE_*_LAN` URLs, gateway `LAN_CLIENT_URL`) still pointed to the old IP —
every API call in `lan` mode targeted an address that no longer existed.
The gateway itself was healthy the whole time.

**Fix:** replaced the IP in `frontend/.env` (3 URLs) and
`server-gateway/.env` (1 URL); restarted both servers (env vars are baked at
startup). Verified: `GET /auth/me` returns `401 application/json` instantly
(correct pre-login response) instead of timing out.

**Recurrence note:** whenever the network/hotspot changes, the same two
files need the new IP — or use `tunnel` mode for a stable HTTPS address.

## 2.2 Gateway EADDRINUSE

A background gateway instance (started for automated testing) survived its
parent process on Windows and held port 5000, colliding with the user's
nodemon. The orphan was killed and the port verified free; the dev terminal
owns the gateway from here on.

## 2.3 Misleading sensor state on HTTP origins

**Symptom:** Android phone paired over LAN (`http://…`) showed *"This
browser doesn't expose motion sensors"* — wrong guidance.

**Root cause:** on insecure origins Chrome **removes the
DeviceOrientation/DeviceMotion interfaces from `window` entirely**, so the
API-presence check concluded "unsupported" before the HTTPS rule was ever
evaluated.

**Fix:** `getSensorCapability()` now tests `window.isSecureContext`
**first**; insecure origins get the actionable state: *"Motion sensors
require a secure (HTTPS) connection."*

**Enabling sensors on a real Android phone (no HTTPS):**
1. `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Enable + add `http://<LAN_IP>:5173` → Relaunch
3. Rescan the QR — Android needs no permission prompt; streaming starts
   automatically.

Proper route: `tunnel` mode (two cloudflared tunnels → HTTPS URLs in both
`.env` files, `NETWORK_MODE=tunnel`).

---

# Part 3 — Session 13: Orientation & Calibration Engine

## Where computation lives

**On the phone.** The socket now carries *meaning, not data*: only the
normalized orientation model crosses the network. The dashboard — and every
future consumer — never sees a browser event, a raw euler angle, or a
browser quirk.

## Pipeline (per sensor sample)

```
DeviceOrientation event (native rate)
  → validate
  → heading calibration        (alpha correction toward a north reference)
  → quaternion                 (W3C intrinsic Z-X'-Y'')
  → screen-rotation adjust     (portrait/landscape invariance)
  → adaptive smoothing         (nlerp, gyro-gated blend factor)
  → angles + confidence        (heading / pitch / roll + scoring)
        │
        └── ≤20Hz orientation_update emit (change-dedup + 2Hz keepalive)
```

## Fixed conventions (encapsulated in `orientationMath.js`)

- **World frame:** ENU — x = East, y = North, z = Up (per W3C).
- **Aim vector:** −z of the *screen* (out the back of the phone, where the
  rear camera looks). `heading` = compass direction of the aim, 0–360°
  clockwise from North. `pitch` = aim altitude, −90° (ground) to +90°
  (zenith). `roll` = rotation about the aim axis, −180..180°.
- **Screen rotation** only affects roll — heading/pitch are invariant to how
  the user holds the phone (verified numerically, see below).
- **Gimbal handling:** within 5° of zenith/nadir the roll reference switches
  to North and the model flags `gimbal: true`.
- The **quaternion (screen→world)** is included in every packet — the
  lossless form future alignment should prefer over euler angles.

## Calibration subsystem (`headingCalibration.js`)

| Browser reality | Source | Behavior |
|-----------------|--------|----------|
| Android `deviceorientationabsolute` (OS magnetometer-fused) | `absolute` | No correction needed — status `calibrated`, quality `high` |
| iOS Safari (arbitrary alpha zero + `webkitCompassHeading`) | `compass` | Smoothed alpha offset vs the compass (EMA 0.05); jumps >25° snap instead of drift; quality tiers from `compassAccuracy` (≤15° high / ≤35° medium / else low); stale after 10s without compass input → `degraded` |
| No compass at all (desktop, some browsers) | `none` | Status `unreferenced` — heading is internally consistent but relative; confidence capped at `medium` |

## Filtering & confidence (`orientationEngine.js`)

- **Adaptive nlerp smoothing** (double-cover aware): blend factor
  k ∈ [0.10, 0.85] rises with angular velocity (gyro `rotationRate` when
  available, quaternion delta otherwise) — hard noise suppression at rest,
  near-passthrough during fast slews. Stability > raw responsiveness.
- **Jitter metric = deviation of angular velocity from its own average**,
  not velocity itself — so a smooth deliberate turn keeps confidence high
  while genuinely noisy sensors drop it. (This distinction was caught and
  fixed by the deterministic test suite — see testing below.)
- **Confidence ladder:** `initializing` (warmup <8 samples) → `low` (input
  <5Hz or jitter >8°/s) → `medium` (unreferenced/degraded calibration) →
  `high`.
- **Stale-guard:** >1.5s without input ⇒ `snapshot()` returns `null`. A
  frozen-but-live-looking orientation is the one failure mode this layer
  must never have; the dashboard mirrors this with a 2s staleness cutoff.

## Socket strategy

- Event: **`orientation_update`** (documented in `WEBSOCKET_PROTOCOL.md`),
  volatile relay, same room/role guards as Session 12.
- **Change-dedup:** packets are skipped unless the estimate moved ≥0.15°,
  metadata (confidence/calibration) changed, or 500ms passed (keepalive).
  Stream rate therefore *tracks motion*: up to 20Hz while slewing, ~2Hz at
  rest — network traffic scales with information content.
- `sensor_frame` remains a documented, relay-supported contract but is no
  longer emitted; `orientation`/`orientation_smoothed` sketches in the
  protocol doc are superseded.

## Files (Session 13)

**Created**

| File | Responsibility |
|------|----------------|
| `frontend/src/services/orientation/orientationMath.js` | Pure math — quaternions, frame conversions, angle extraction (Node-testable, zero browser APIs) |
| `frontend/src/services/orientation/headingCalibration.js` | North-reference lifecycle + quality (pure state machine) |
| `frontend/src/services/orientation/orientationEngine.js` | Stateful pipeline: calibrate → smooth → score (injectable clocks) |
| `frontend/src/hooks/useOrientationStream.js` | Phone lifecycle: permission machine, native-rate ingest, deduped ≤20Hz emit, 4Hz on-phone digest |
| `frontend/src/hooks/useOrientationFeed.js` | Dashboard consumer: refs + 4Hz commits, staleness, seq-gap tracking |
| `frontend/src/components/dashboard/OrientationPanelCard.jsx` | Temporary dev panel: heading/pitch/roll readout, confidence, calibration, rates, quaternion |

**Modified**

- `frontend/src/services/sensor.service.js` — per-event callbacks added
  (`onOrientation`/`onMotion`) — extended, not replaced
- `server-gateway/src/sockets/sensorSocket.js` — `orientation_update` relay
- `frontend/src/components/alignment/SensorPermissionPanel.jsx`,
  `SensorStreamIndicator.jsx` — phone shows live HDG/PITCH/ROLL + confidence
- `frontend/src/pages/Dashboard.jsx` — panel swap
- `WEBSOCKET_PROTOCOL.md` — new event documented

**Deleted (superseded):** `useSensorStream.js`, `useSensorFeed.js`,
`SensorDiagnosticsCard.jsx`

---

# Part 4 — Session 13 testing (detailed)

## 4.1 Pure math verification — 21 cases, all pass

Node script importing `orientationMath.js` directly, asserting against
physically-reasoned poses:

| Case | Expectation | Result |
|------|-------------|--------|
| Flat on table, top North | pitch −90 (aim at ground) | ✅ −90.000 |
| Upright, screen at user | heading 0, pitch 0, roll 0 | ✅ exact |
| Upright, alpha=90 | heading 270 (aim West; heading = 360−α at level) | ✅ 270.000 |
| beta=180 | pitch +90 (zenith) | ✅ 90.000 |
| beta=135 | pitch +45, heading 0 | ✅ exact |
| Upright + gamma=30 | heading yaws to 330 (device y points at zenith at beta=90 ⇒ intrinsic gamma is a yaw, not a roll — W3C order subtlety) | ✅ 330.000 |
| Screen rotated 90° | heading/pitch **unchanged**, roll shifted exactly 90° | ✅ exact |
| Aim vector, alpha=90 upright | (−1, 0, ·) = West | ✅ exact |
| nlerp convergence + double-cover (negated quaternion) | converges, no flip | ✅ |
| `circularDelta(350,10)` = −20, `normalizeHeading(−90)` = 270 | ✅ | ✅ |

## 4.2 Deterministic engine verification — 23 cases, all pass

The engine takes timestamps as inputs (no wall clock), so the full pipeline
runs in Node at a true simulated 30Hz:

| Phase | Scenario | Result |
|-------|----------|--------|
| 1 | 5s upright at North, realistic ±0.15° noise | heading 0.02°, pitch 0.01°, confidence **high**, `calibrated/absolute`, input rate 30.0Hz ✅ |
| 2 | 4s smooth turn to West + 1s settle | heading **270.09°**; confidence stays **high mid-turn** (steady velocity ≠ jitter) ✅ |
| 3 | 4s tilt up 45° + settle | pitch **44.93°**, heading held 270.00° ✅ |
| 4 | Same physical pose reported in landscape (screenAngle 90) | heading/pitch invariant, roll shifted 89.97° ✅ |
| 5 | 2s input silence | `snapshot()` → **null** (stale model withheld) ✅ |
| 6 | iOS-style: relative alpha + compassHeading 90, accuracy 10° | offset −90 applied, `compass/calibrated/high` ✅ |
| 6b | Heavy noise (±1.5° jumps) | confidence **low** ✅ |
| 7 | No compass reference at all | `unreferenced`, confidence capped **medium** ✅ |

**Bug found and fixed by this suite:** the original jitter metric used raw
angular velocity, so *any* deliberate motion tanked confidence to `low`.
Replaced with velocity-deviation (mean deviation of angular velocity from
its own EMA): constant-rate slews stay `high`; noise still flags `low`.

## 4.3 Live end-to-end (browser → gateway → headless dashboard)

Real `/align` page as the phone, real gateway relay, headless Node dashboard
client + imposter client:

- Full lifecycle observed: `phone_connected` → `sensor_status started` →
  `probed {orientation: true, motion: false}` → `orientation_update` packets
  with correct v1 shape, `calibrated/absolute`, confidence transitions.
- Imposter dashboard-role `orientation_update`: **blocked** (zero leakage).
- No raw `sensor_frame` emitted (retired path confirmed).
- Stale-guard live: during input gaps the phone stopped emitting entirely
  (no keepalive of a dead model) — dashboard flagged the stream stale.
- Visibility handling live: backgrounded tab → `"Paused — screen not
  visible"` state fired correctly.

**Harness caveat (documented, not a product issue):** the preview browser
tab is hidden, and Chrome applies *intensive timer throttling* to
long-hidden tabs (~1 tick/min), which starved the synthetic event generator
— this is why numeric convergence was proven in the deterministic Node
harness (4.2) rather than the browser run. A real phone with the screen on
is unaffected; a hidden page pauses deliberately by design.

## 4.4 Builds & regressions

- `vite build` — ✅ pass (after every change)
- `node --check` on gateway sockets — ✅ pass
- Fresh page load post-deletions — ✅ clean (HMR "failed to reload
  SensorDiagnosticsCard" console noise was stale dev-server state from
  deleting a file mid-session; production build and fresh loads are clean)

## 4.5 Manual on-device checklist (recommended)

- [ ] Pair via QR (tunnel mode, or LAN + Chrome insecure-origin flag)
- [ ] Android: streaming starts automatically; phone shows HDG/PITCH/ROLL
- [ ] iOS: "Enable Motion Sensors" tap → permission prompt → streaming
- [ ] Point the phone at a known compass direction — heading matches
- [ ] Rotate portrait ↔ landscape — heading/pitch hold steady
- [ ] Lay flat: pitch −90; point at sky: pitch → +90 (roll flagged near zenith)
- [ ] Dashboard "Orientation Engine" card: confidence/calibration badges,
      stream rate rises with motion and falls to ~2/s at rest
- [ ] Deny permission → dashboard explains why
- [ ] Lock/unlock phone → paused → resumes
- [ ] Kill Wi-Fi briefly → Stale → recovers after reconnect
- [ ] Dashboard Disconnect → phone shows Session Ended

---

# Known limitations

1. **HTTPS requirement** — Chrome/Safari block motion sensors on insecure
   origins; LAN (`http://`) testing needs the Chrome flag workaround or
   tunnel mode.
2. **iOS compass relation is the flat-phone simplification**
   (α ≈ 360 − webkitCompassHeading) — least accurate at steep pitch; refine
   when real-device testing shows the error profile.
3. **Magnetic vs true north (declination) is deliberately deferred** to the
   astronomy layer (FastAPI), which knows the observer's location.
4. **No-compass devices** get relative heading, explicitly flagged
   `unreferenced` — never silently wrong.
5. **One phone per room** (existing pairing convention).
6. Clock Δ shown on dev panels includes device clock skew — it is not pure
   latency.

---

# Future integration points

- **Telescope Alignment (next):** consume `orientation_update.quaternion`
  (screen→world, ENU) directly — no browser knowledge needed. Gate actions
  on `confidence` and `calibration.status`.
- **Astro Engine:** apply magnetic declination from observer location;
  convert aim vector to Alt/Az → RA/Dec.
- **Calibration UX:** a future "point at a known star/landmark" manual
  calibration can simply write a heading offset through the existing
  calibration manager.
- **Observation recording / AI copilot:** subscribe to the same
  `orientation_update` stream; the packet is versioned (`v`) — extend by
  bumping the version, never by renaming fields.

---

# Verification artifacts

| Artifact | What it proves |
|----------|----------------|
| 21-case math suite (Node) | Frame conventions, extraction, invariances |
| 23-case engine suite (Node, deterministic 30Hz) | Convergence, calibration, confidence, stale-guard |
| Headless-dashboard E2E logs | Relay, security guards, lifecycle events, packet shape |
| Imposter client | Role-guard enforcement (both sessions) |
| `vite build` + `node --check` | No syntax/import regressions |

*Test harnesses live in the session scratchpad (not committed); the math
and engine suites are trivially re-creatable since both modules are pure
ESM with injectable clocks — a permanent `frontend/tests/` home is
recommended when a test runner is added to the project.*

# Cloudflare Tunnel Setup Guide (Development)
## SkyGuide AI — HTTPS, Phone Sensors, Cookies & CORS

> This document records every networking-related change made to enable secure mobile sensor streaming using Cloudflare Quick Tunnels.
>
> Without HTTPS, modern mobile browsers (especially Chrome and Safari) refuse access to motion/orientation sensors.
>
> This setup allows phones to securely connect to the local development machine while leaving the backend architecture unchanged.

---

# Final Architecture

```
                Phone
                  │
                  │ HTTPS
                  ▼
      Cloudflare Frontend Tunnel
                  │
                  ▼
        React + Vite Frontend
                  │
                  │ HTTPS
                  ▼
      Cloudflare Backend Tunnel
                  │
                  ▼
         Express Gateway (5000)
                  │
                  │ HTTP (localhost)
                  ▼
        FastAPI Astro Engine (8000)
```

FastAPI remains private.

Only the frontend and Express gateway are exposed.

---

# Why Cloudflare Tunnel?

Modern browsers require a **Secure Context** for

- Device Orientation
- Device Motion
- Camera
- Microphone
- Clipboard
- Web Bluetooth
- WebUSB

Local HTTP

```
http://192.168.x.x
```

is **NOT** considered secure.

Cloudflare provides

```
https://xxxxx.trycloudflare.com
```

which satisfies browser security requirements.

---

# Installing Cloudflared

Download

Cloudflared (64-bit MSI)

Install normally.

Verify

```bash
cloudflared --version
```

---

# Creating Quick Tunnels

## Frontend

```bash
cloudflared tunnel --url http://localhost:5173
```

Example

```
https://frontend-random.trycloudflare.com
```

Keep the terminal open.

---

## Backend

```bash
cloudflared tunnel --url http://localhost:5000
```

Example

```
https://backend-random.trycloudflare.com
```

Keep this terminal open as well.

Stopping either terminal destroys that tunnel.

---

# Frontend Environment

```
VITE_NETWORK_MODE=tunnel

VITE_TUNNEL_FRONTEND_URL=https://frontend-random.trycloudflare.com

VITE_API_TUNNEL=https://backend-random.trycloudflare.com

VITE_SOCKET_TUNNEL=https://backend-random.trycloudflare.com

VITE_QR_BASE_URL=https://frontend-random.trycloudflare.com
```

Restart Vite after changing `.env`.

---

# Gateway Environment

```
NETWORK_MODE=tunnel

TUNNEL_CLIENT_URL=https://frontend-random.trycloudflare.com
```

Restart Node after changing `.env`.

---

# FastAPI Environment

Allow the frontend tunnel.

Example

```
CORS_ORIGINS=

http://localhost:5173,

http://192.168.x.x:5173,

https://frontend-random.trycloudflare.com
```

FastAPI restart required.

---

# Cookie Configuration

The biggest issue encountered during development.

---

## Problem

Cloudflare Quick Tunnels create two completely different domains.

Example

```
Frontend

https://frontend.trycloudflare.com

↓

Backend

https://backend.trycloudflare.com
```

Browser considers these

```
Cross Site
```

Therefore

```
SameSite=Lax
```

cookies are NEVER sent.

Result

```
POST /login

200 OK

↓

GET /auth/me

401 Unauthorized
```

---

## Solution

Determine secure mode from

```
NETWORK_MODE
```

instead of

```
NODE_ENV
```

Recommended

```javascript
const isSecure =
    process.env.NETWORK_MODE === "tunnel" ||
    process.env.NODE_ENV === "production";

const cookieOptions = {

    expires: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
    ),

    httpOnly: true,

    secure: isSecure,

    sameSite: isSecure
        ? "none"
        : "lax",
};
```

Required cookie flags while using Cloudflare

```
HttpOnly

Secure

SameSite=None
```

---

# CORS Configuration

Gateway

Allowed Origins

```
localhost

LAN

Cloudflare Tunnel
```

Never use

```
*
```

because

```
credentials: true
```

requires explicit origins.

Example

```
http://localhost:5173

http://192.168.x.x:5173

https://frontend-random.trycloudflare.com
```

---

FastAPI

```
allow_credentials=True

allow_origins=settings.cors_origins
```

---

# Axios

Every authenticated request must include

```javascript
withCredentials: true
```

Example

```javascript
axios.get(url, {

    withCredentials: true

});
```

---

# Socket.IO

Socket base URL

```
Tunnel Backend URL
```

Example

```
https://backend-random.trycloudflare.com
```

Socket architecture remains unchanged.

No socket code modifications required.

---

# QR Code

QR pairing should always encode

```
Frontend Tunnel URL
```

Never encode localhost.

Example

```
https://frontend-random.trycloudflare.com/align?session=...
```

---

# Browser Verification

Verify

```
window.isSecureContext
```

Expected

```
true
```

Verify

```
typeof DeviceOrientationEvent
```

Verify

```
typeof DeviceMotionEvent
```

Both should exist.

---

# Cookie Debugging

Application

↓

Cookies

↓

Backend Tunnel

Should display

```
Secure

✓

SameSite

None

HttpOnly

✓
```

If

```
SameSite=Lax
```

authentication will fail.

---

# Network Debugging

Login flow

```
POST /login

↓

200

↓

Set-Cookie

↓

GET /auth/me

↓

Cookie attached

↓

200
```

If

```
GET /auth/me

401
```

Check

Request Headers

Should include

```
Cookie:

jwt=...
```

If missing

The browser rejected the cookie.

---

# Common Problems

## Tunnel does not open

Wait a few seconds.

Quick Tunnels sometimes take time to establish.

---

## Phone sensors unavailable

Check

```
window.isSecureContext
```

Must be

```
true
```

---

## Authentication broken

Usually

```
SameSite=Lax
```

or

```
Secure=false
```

---

## CORS errors

Confirm

Frontend Tunnel URL

exists in

Gateway

and

FastAPI

allowed origins.

---

## Socket not connecting

Verify

```
VITE_SOCKET_TUNNEL
```

points to

Backend Tunnel URL.

---

# Development Workflow

Start Astro Engine

```
uvicorn app.main:app --reload
```

Start Gateway

```
npm run dev
```

Start Frontend

```
npm run dev
```

Create Frontend Tunnel

```
cloudflared tunnel --url http://localhost:5173
```

Create Backend Tunnel

```
cloudflared tunnel --url http://localhost:5000
```

Update

```
.env
```

Restart

Node

Restart

Vite

Open

Frontend Tunnel URL

Grant

Sensor Permission

Begin testing.

---

# Future Improvement

Quick Tunnels generate a new random URL every session.

Long-term, migrate to a **Named Cloudflare Tunnel** using a custom domain.

Advantages

- Stable HTTPS URL
- No `.env` changes every restart
- Better production parity
- Cleaner authentication
- Easier demos
- Simpler QR generation

---

# Final Result

SkyGuide AI now supports

- HTTPS development
- Secure mobile sensor access
- Cloudflare Tunnel networking
- Cross-origin authentication
- Cookie-based JWT authentication
- Secure Socket.IO communication
- Mobile browser compatibility
- Realtime phone sensor streaming

without modifying the existing backend architecture.