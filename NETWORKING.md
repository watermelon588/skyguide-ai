# NETWORKING.md

# 🌐 SkyGuide AI — Dual Network Mode (LAN + Cloudflare Tunnel)

> Switch the entire app between **local**, **LAN**, and **Cloudflare tunnel**
> networking by changing only environment variables. No source code changes.

---

## Philosophy

No component or service hardcodes `localhost`, a LAN IP, or a tunnel host.
Every externally-visible URL is resolved through a single configuration layer:

| Layer    | File                                 | Reads              |
| -------- | ------------------------------------ | ------------------ |
| Frontend | `frontend/src/config/network.js`     | `VITE_NETWORK_MODE`|
| Gateway  | `server-gateway/src/config/network.js` | `NETWORK_MODE`   |

```
                 Network Configuration
                         │
        ┌────────────────┼────────────────┐
     Local             LAN            Cloudflare
        └────────────────┼────────────────┘
                         │
                Frontend + Gateway
                         │
                 QR + REST + Socket.IO
```

---

## Network modes

| Mode     | Desktop → Phone reach          | Use case                 |
| -------- | ------------------------------ | ------------------------ |
| `local`  | localhost only                 | Solo desktop development |
| `lan`    | `192.168.x.x` (same Wi-Fi)     | Phone on the same router |
| `tunnel` | `*.trycloudflare.com` / domain | Phone anywhere on Earth  |
| `production` *(reserved)* | custom domain     | Future deploy            |

---

## Frontend config API (`config/network.js`)

```js
getFrontendBaseUrl()  // web app base — used for QR pairing links
getApiBaseUrl()       // Express gateway (REST)
getSocketBaseUrl()    // Socket.IO (served by the gateway) === API base
getQrBaseUrl()        // === frontend base
getAstroBaseUrl()     // FastAPI Astro Engine
getNetworkInfo()      // { mode, frontendUrl, apiUrl, socketUrl, qrUrl, astroUrl }
```

Resolution degrades gracefully: `active mode URL → local URL → window.location.origin`.

## Gateway config API (`config/network.js`)

```js
getNetworkMode()      // "local" | "lan" | "tunnel"
getClientUrl()        // active-mode client URL
getAllowedOrigins()   // ALL configured origins (deduped, no wildcard) → CORS
getHost()             // "0.0.0.0"
logNetworkConfig(port)// startup banner
```

---

## Environment variables

### Frontend (`frontend/.env`)

```
VITE_NETWORK_MODE=lan

VITE_LOCAL_FRONTEND_URL=http://localhost:5173
VITE_LAN_FRONTEND_URL=http://192.168.1.15:5173
VITE_TUNNEL_FRONTEND_URL=https://your-subdomain.trycloudflare.com

VITE_API_LOCAL=http://localhost:5000
VITE_API_LAN=http://192.168.1.15:5000
VITE_API_TUNNEL=https://api.yourdomain.com

VITE_ASTRO_LOCAL=http://localhost:8000
VITE_ASTRO_LAN=http://192.168.1.15:8000
VITE_ASTRO_TUNNEL=https://astro.yourdomain.com
```

### Gateway (`server-gateway/.env`)

```
NETWORK_MODE=lan
LOCAL_CLIENT_URL=http://localhost:5173
LAN_CLIENT_URL=http://192.168.1.15:5173
TUNNEL_CLIENT_URL=https://your-subdomain.trycloudflare.com
```

> After editing `frontend/.env`, **restart `npm run dev`** — Vite only reads env
> vars at startup (they are compiled into the bundle).

---

## LAN setup

1. **Find your machine's LAN IP.**
   - Windows: `ipconfig` → *IPv4 Address* (e.g. `192.168.1.15`)
   - macOS/Linux: `ipconfig getifaddr en0` / `hostname -I`
2. **Set it** in both `.env` files (`VITE_*_LAN` and `LAN_CLIENT_URL`).
3. **Select LAN mode**: `VITE_NETWORK_MODE=lan` and `NETWORK_MODE=lan`.
4. **Start servers** (both already bind `0.0.0.0`):
   ```
   # gateway
   cd server-gateway && npm run dev
   # frontend (vite.config.js sets host:true → reachable on the LAN)
   cd frontend && npm run dev
   ```
5. **Phone**: connect to the *same Wi-Fi*, open `http://192.168.1.15:5173`.
6. **Firewall**: allow inbound TCP `5173` and `5000` (Windows may prompt on first run).

---

## Cloudflare Tunnel setup

Quick, no-account "try" tunnels (temporary `*.trycloudflare.com` URLs):

1. **Install cloudflared**
   - Windows: `winget install --id Cloudflare.cloudflared`
   - macOS: `brew install cloudflared`
2. **Start your servers** locally (gateway `:5000`, frontend `:5173`).
3. **Tunnel each port** (separate terminals):
   ```
   cloudflared tunnel --url http://localhost:5173   # frontend
   cloudflared tunnel --url http://localhost:5000   # gateway
   ```
   Each prints a public URL, e.g. `https://random-words.trycloudflare.com`.
4. **Paste those URLs** into the `*_TUNNEL_*` vars:
   - Frontend URL → `VITE_TUNNEL_FRONTEND_URL` **and** `TUNNEL_CLIENT_URL`
   - Gateway URL  → `VITE_API_TUNNEL`
5. **Select tunnel mode**: `VITE_NETWORK_MODE=tunnel`, `NETWORK_MODE=tunnel`.
6. **Restart** the frontend dev server so the new env compiles in.
7. **Phone**: open the frontend tunnel URL from anywhere — pairing works globally.

### Named tunnels / custom domain (future)

`cloudflared tunnel login` → `cloudflared tunnel create skyguide` → route DNS →
run with a config file. Only the `*_TUNNEL_*` env values change; **no code edits**.

---

## What changed for pairing

- **QR code** (`QRCodeModal.jsx`) now encodes `getQrBaseUrl() + /align?room&token`
  instead of `window.location.origin` — so it always points at the LAN IP or
  tunnel host the phone can actually reach.
- **Socket.IO** (`socket.service.js`) connects to `getSocketBaseUrl()` on both the
  desktop and the phone (`/align`), never a hardcoded host.
- **REST services** (auth / user / alignment / chat / weather) call
  `getApiBaseUrl()` / `getAstroBaseUrl()`.
- **Gateway** binds `0.0.0.0` and CORS-allows every configured origin at once,
  so the desktop (localhost) and phone (LAN/tunnel) can share a session.

---

## Developer utility

A dev-only **Network** panel (bottom-left, `components/dev/NetworkStatus.jsx`)
shows the resolved mode + Frontend/API/Socket/QR/Astro/Origin URLs. It renders
nothing in production. The frontend also logs the active mode to the console on
startup; the gateway prints a banner on `server.listen`.

---

## Testing

### LAN
- [ ] Frontend reachable from phone at `http://<LAN-IP>:5173`
- [ ] Gateway reachable from phone at `http://<LAN-IP>:5000/health`
- [ ] QR opens `/align` on the phone (no `localhost` in the URL)
- [ ] Socket connects; room joins; dashboard shows "connected"
- [ ] Disconnect from the dashboard syncs to the phone

### Cloudflare
- [ ] Frontend reachable globally via the tunnel URL
- [ ] Gateway reachable globally via its tunnel URL
- [ ] QR opens correctly on a phone off the local network
- [ ] Socket.IO connects through the tunnel; pairing succeeds
- [ ] Disconnect syncs correctly

---

## Constraints honoured

Networking only — no sensor streaming, compass, alignment, Astro Engine, Weather
Engine, or pairing-logic changes. This session just makes every URL configurable.
