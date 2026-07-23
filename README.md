<div align="center">

<img src="frontend/public/brand/logo.png" alt="SkyGuide AI" width="110" height="110" />

# SkyGuide AI

### A real-time personalized celestial matchmaking & telescope alignment platform

*Answers the question every amateur astronomer actually has:*

> ### "I have a telescope. What should I look at right now — and how do I point at it?"

**[Live demo](#) · [Features](#-what-it-does) · [Architecture](#-architecture) · [Getting started](#-getting-started)**

[![React](https://img.shields.io/badge/React-19-0049CD?logo=react&logoColor=white)](https://react.dev)
[![Node](https://img.shields.io/badge/Express-5-0049CD?logo=node.js&logoColor=white)](https://expressjs.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-Astropy-0049CD?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-0049CD?logo=mongodb&logoColor=white)](https://mongodb.com)

</div>

---

<!-- ═══════════════════════════════════════════════════════════════
     DEMO — replace the placeholders below with real captures.
     Suggested: create a /docs/media folder and drop assets there.
     ═══════════════════════════════════════════════════════════ -->

## 🎬 A look around

<div align="center">

<img src="docs/media/landing.png" alt="SkyGuide AI landing page" width="900" />

</div>

<table>
<tr>
<td width="50%" align="center">
<img src="docs/media/dashboard.png" alt="Dashboard — the observatory workspace" width="100%" /><br/>
<b>Dashboard</b><br/><sub>Location, telescope, conditions and Astro, the AI assistant</sub>
</td>
<td width="50%" align="center">
<img src="docs/media/target-detail.png" alt="Target panel — Hercules Globular Cluster" width="100%" /><br/>
<b>Target panel</b><br/><sub>Real imagery, a 0–100 score, and live visibility for your sky</sub>
</td>
</tr>
<tr>
<td width="50%" align="center">
<img src="docs/media/alignment.png" alt="Alignment workspace with a paired phone" width="100%" /><br/>
<b>Alignment</b><br/><sub>The phone streams orientation; the app talks you onto target</sub>
</td>
<td width="50%" align="center">
<img src="docs/media/explore-catalog.png" alt="Explore — the full catalog" width="100%" /><br/>
<b>Explore</b><br/><sub>All 13,311 objects — charted, filtered, searchable</sub>
</td>
</tr>
<tr>
<td width="50%" align="center">
<img src="docs/media/gallery.png" alt="Community gallery" width="100%" /><br/>
<b>Gallery</b><br/><sub>The ten most-loved nights, fanned out</sub>
</td>
<td width="50%" align="center">
<img src="docs/media/observers-nearby.png" alt="Community — observers nearby" width="100%" /><br/>
<b>Community</b><br/><sub>Nearby observers on a privacy-safe map (~40 km cells)</sub>
</td>
</tr>
</table>

### 📱 The phone becomes the instrument

<table>
<tr>
<td width="33%" align="center">
<img src="docs/media/mobile/phone-qr-scan.jpg" alt="Scanning the pairing QR code" width="100%" /><br/>
<sub><b>1. Scan</b> — the QR opens the installed companion</sub>
</td>
<td width="33%" align="center">
<img src="docs/media/mobile/phone-guidance.jpg" alt="Live alignment guidance on the phone" width="100%" /><br/>
<sub><b>2. Follow</b> — rotate and tilt until it reads 0° off target</sub>
</td>
<td width="33%" align="center">
<img src="docs/media/mobile/responsive-6.png" alt="Community page on mobile" width="100%" /><br/>
<sub><b>3. Everything else</b> — the full app is responsive too</sub>
</td>
</tr>
</table>

<div align="center">
<b><a href="docs/SCREENSHOTS.md">→ See all 52 screenshots</a></b>
</div>

---

## ✨ What it does

SkyGuide AI is not a catalog viewer. It ranks **tonight's actual sky** for **your** telescope, from **your** location, under **your** conditions — then walks you onto the target.

| | Feature | What it means |
|---|---|---|
| 🎯 | **Personalized recommendations** | Every object scored 0–100 for your aperture, field of view, light pollution, moon interference and observing history |
| 🌙 | **Tonight's Brief** | A short written observing plan for the night, generated from live sky state |
| 🔭 | **Telescope alignment** | Mount your phone on the scope; its orientation streams over WebSocket and the app guides you onto the target live |
| 🌌 | **13,311 deep-sky objects** | Messier + NGC + IC, with imagery, science data, rise/transit/set and live geometry |
| 📍 | **Sky quality mapping** | Bortle-aware scoring plus suggested darker sites nearby |
| 🛰️ | **Satellite & ISS passes** | Visible, sunlit passes only — not just anything overhead |
| 📋 | **Observation planner** | Queue targets, mark them observed, build an observing résumé |
| 👥 | **Community** | Nearby observers on a privacy-safe map (~40 km cells, never exact coordinates), regional chat and DMs |
| 🖼️ | **Community gallery** | Share your night's photos, like others'; the ten most-loved are featured, each paired with a line from the astronomy canon |
| 🔔 | **Alerts & digest** | Nightly digest plus event alerts: great nights, ISS passes, season-ending targets, new-moon windows |
| 🤖 | **Astro, the AI assistant** | Answers astronomy and app questions, grounded in your live context |

---

## 🏗️ Architecture

A distributed three-service system. The split is deliberate: **scientific computation never happens in JavaScript, and the browser never touches the engine.**

```text
                        ┌────────────────────────┐
                        │   React 19 Frontend    │
                        │  (Vite · Tailwind 4)   │
                        └───────────┬────────────┘
                                    │  REST + Socket.IO
                                    │  (HTTP-only cookie auth)
                        ┌───────────▼────────────┐
                        │   Express 5 Gateway    │
                        │  auth · sockets · CRUD │
                        │  rate limits · cron    │
                        └─────┬────────────┬─────┘
                              │            │
              X-Internal-Key  │            │
           (server-to-server) │            │
                        ┌─────▼──────┐  ┌──▼──────────┐
                        │  FastAPI   │  │  MongoDB    │
                        │Astro Engine│──│   Atlas     │
                        │  Astropy   │  └─────────────┘
                        │  Skyfield  │
                        │  Astroplan │
                        └────────────┘
                         PRIVATE SERVICE
                      (never browser-facing)
```

### Responsibility boundaries

| Service | Owns | Never does |
|---|---|---|
| **Frontend** (React 19, Vite, Tailwind 4) | UI, visualization, sensor capture, socket client | Astronomical calculation |
| **Gateway** (Express 5, Socket.IO, Mongoose) | Auth, sessions, profiles, rooms, pairing, CRUD, scheduling | Astronomy math |
| **Astro Engine** (FastAPI, Astropy, Skyfield, Astroplan) | Coordinates, visibility, planning, scoring, recommendations | Anything user-facing |

The engine is a **private service**. Browsers reach its public science endpoints only through the gateway's allowlisted proxy at `/api/v1/astro/*`; the engine itself requires a shared `X-Internal-Key` and refuses to start in production without one.

---

## 🧰 Tech stack

**Frontend** — React 19 · Vite · Tailwind CSS 4 · Framer Motion · GSAP + ScrollTrigger · Three.js · MapLibre GL · Recharts · TanStack Query · Socket.IO client

**Gateway** — Node.js · Express 5 · Socket.IO · Mongoose · JWT (HTTP-only cookies) · bcrypt · Helmet · express-rate-limit · node-cron · Nodemailer · Groq SDK

**Astro Engine** — Python 3.13 · FastAPI · Motor (async MongoDB) · Astropy 8 · Astroplan · Skyfield · Astroquery · NumPy

**Data** — MongoDB Atlas · OpenNGC catalog · Celestrak TLEs · OpenWeather · OpenStreetMap Nominatim

---

## 🚀 Getting started

### Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **MongoDB Atlas** cluster (or local MongoDB)
- *(optional)* **cloudflared** — only for LAN/tunnel dev modes

### 1. Clone and install

```bash
git clone https://github.com/watermelon588/skyguide-ai.git
cd skyguide-ai
```

```bash
npm install && npm --prefix frontend install && npm --prefix server-gateway install
```

```bash
cd astro-engine && python -m venv venv && ./venv/Scripts/activate && pip install -r requirements.txt
```

> On macOS/Linux use `source venv/bin/activate` instead.

### 2. Configure environment

Copy each template and fill it in:

```bash
cp server-gateway/.env.example server-gateway/.env
cp astro-engine/.env.example astro-engine/.env
cp frontend/.env.example frontend/.env
```

Generate the two shared secrets:

```bash
node -e "console.log('JWT_SECRET      =', require('crypto').randomBytes(32).toString('hex')); console.log('INTERNAL_API_KEY=', require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ **`INTERNAL_API_KEY` must be identical** in `server-gateway/.env` and `astro-engine/.env` — it is how the engine knows a request came from the gateway.

### 3. Seed the catalog

```bash
cd astro-engine && ./venv/Scripts/python.exe scripts/seed_ngc_catalog.py
```

### 4. Run

One command starts all three services:

```bash
npm run dev
```

| Command | Mode |
|---|---|
| `npm run dev` | localhost only |
| `npm run dev:lan` | reachable from phones on your Wi-Fi |
| `npm run dev:tunnel` | public Cloudflare Quick Tunnels (needed for phone sensors — they require HTTPS) |

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Gateway | http://localhost:5000 |
| Astro Engine | http://localhost:8000 ( `/docs` for Swagger ) |

> 📱 **Phone sensors require HTTPS.** Use `npm run dev:tunnel` to test alignment on a real device.

---

## 🔐 Security

- **HTTP-only cookie sessions** — JWTs are never exposed to JavaScript, never in `localStorage`
- **bcrypt** password hashing (cost 12)
- **Engine isolation** — shared-key auth, allowlisted proxy, API docs disabled in production
- **Layered rate limiting** — failed-login, OTP-guess, password-reset and LLM-spend limiters, each keyed appropriately
- **Proxy-aware** — `trust proxy` follows deployment shape, so limits can't be forged *or* collapse into one shared bucket
- **Privacy by design** — community location is a ~40 km geohash cell centre; public profiles are built from an explicit whitelist, never a raw document
- **Generic auth responses** — login and password-reset reveal nothing about which accounts exist

---

## 📁 Project structure

```text
skyguide-ai/
├── frontend/              React 19 SPA + mobile companion (/align.html)
│   └── src/
│       ├── components/    UI, grouped by feature
│       ├── context/       Auth, Socket, Pairing, Chat, Toast
│       ├── hooks/         Data-fetching + behaviour hooks
│       ├── pages/         Route components
│       └── services/      ALL API calls live here
├── server-gateway/        Express 5 gateway
│   └── src/
│       ├── controllers/   Thin HTTP shaping
│       ├── services/      Business logic
│       ├── models/        Mongoose schemas
│       ├── sockets/       Socket.IO namespaces
│       ├── jobs/          Cron (digest, alerts)
│       ├── middleware/    Auth, rate limiting
│       └── uploads/       Gallery photos (runtime data, gitignored)
└── astro-engine/          FastAPI scientific engine
    └── app/
        ├── api/v1/        Routers
        ├── services/      Astronomy + ML
        ├── schemas/       Pydantic contracts
        └── core/          Config, DB, logging
```

---

## 🗺️ Roadmap

- [ ] ML transparency prediction model
- [ ] Airmass & altitude curve visualizations
- [ ] Native mobile companion (React Native)
- [ ] Multi-telescope profiles per observer
- [ ] Astrophotography session planner
- [ ] GoTo mount control integration

---

## 📄 License

*(Add a license — MIT is the common choice for portfolio projects.)*

---

<div align="center">

Built by [Rohit Maity](https://github.com/watermelon588)

*Clear skies. 🔭*

</div>
