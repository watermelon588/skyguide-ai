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
- **FX primitives** in `components/fx/` — hand-built (reactbits-style), reused on
  every page:

| Primitive | Role |
|---|---|
| `MagneticButton` | Pointer-follow lean + spring-back; inner content trails the shell |
| `ScrollMarquee` | Horizontal text driven by **vertical** scroll — scroll down pushes it one way, up reverses; idle drift; seamless wrap |
| `Marquee` | Plain infinite auto-scrolling strip (time-based) |
| `AngularText` | "Angular" headline reveal — words swing up with `rotationX` + `skewY` on scroll-in |
| `SplitReveal` | Words rise out of overflow masks on scroll-in |
| `Reveal` | Generic fade + rise on enter |
| `BentoGrid` / `BentoCard` | Hairline-gapped flat tiles, span-driven |
| `VideoBackground` | Full-bleed video/poster + dark wash + scroll parallax; `blur`/`overlay`/`size` props |
| `gsap.js` | Single `registerPlugin(ScrollTrigger)` + `prefersReducedMotion()` |

Motion split: **GSAP + ScrollTrigger** owns scroll-driven work; **Framer Motion**
owns pointer/presence. Every primitive collapses to a fade (or goes static)
under `prefers-reduced-motion`.

## 3.3 Pages converted

Converted in order, one surface per pass:

| Surface | What changed |
|---|---|
| **Home** | **Video hero** — a self-hosted mp4 in `/public`, softly blurred under a dark wash and *framed* (`size="h-[88vh] w-[92%] max-w-6xl"`) so black borders it rather than running edge-to-edge, with scroll parallax; **collapsible interactive navbar** (hides on scroll-down, reveals on scroll-up, full-screen overlay menu on mobile); GSAP split headline (sized down to `clamp(2rem,5.5vw,4rem)`); `MagneticButton` CTAs; a **scroll-driven marquee band** (two rows, opposite directions); bento feature grid; `AngularText` reveals on section headings |
| **Login** | Editorial split — full-bleed image panel + flat, radius-0, blue form; dropped the astronaut art + `animations.css`/FontAwesome imports; Lucide back-arrow |
| **Dashboard** | Shell + `DashboardCard` primitives; **telescope operations (Sync / Orientation / Alignment) promoted to the top section**, right after the Telescope card; observe-flow banner, `FlowSlot` ring, `LocationSetupCard`, skeletons |
| **Tonight + TargetPanel** | `TonightHero`, `StatStrip`, `SkyDome` (all-sky SVG — blue "N", blue hover halos, blue score dots), `TopTargets`, `MoonPanel`, `ConditionsPanel` (blue meters), `CatalogTable`; `TargetHero` + `VisibilityStrip` |
| **Profile / PublicProfile** | Flat sections, blue focus inputs, blue visibility selector; `Avatar` / `AvatarUploader` / `StatsBand` |
| **Guide** | Shell, hero, progress bar, `GuideStep` (blue number tiles, green ticks), `GuideRail` |
| **Global chrome** | `AppLayout`, app `Navbar` (blue "AI", hairline border, hover-to-blue), `AiSidebar`, `ChatWidget` / `ChatWindow` (blue user bubbles) |
| **Weather / Telescope / Modals** | `WeatherButton/Metric/Skeleton/Popover`; `TelescopeModal/Form/Search/Preview/Specs/TypeBadge`; `QRCodeModal`, `ManualLocationModal`, `LocationPermissionModal` (flat `surface-1`, blue icon tiles, `backdrop-blur` scrims → solid `black/60`) |
| **UI primitives** | `Button` (blue primary — ripples app-wide), `Dropdown` (flat menu, blue active), `Toggle` (blue track) |

**De-oranging the shared logic** (not just classes):

- `vocabulary.scoreColor` — strong scores now earn **blue** (`#1E63FF` / `#0049CD`)
  instead of orange, so score rings/dots/meters read on-brand everywhere.
- `SpotlightCard` — flat `bg-surface-2` + hairline; cursor spotlight re-tinted blue.
- `utils/weather.js` — the observing-quality scale kept its sequential data-viz
  ramp but the **"Poor" tier moved off orange → amber**; unknown-state glass flattened.
- `profile/Avatar` — identity-tint palette stays multi-hue (it distinguishes
  observers) but the two leading **orange** tints were swapped for blues.
- `alignment/ConnectionIndicator` — status tones moved to `success` / `accent` /
  `danger` / `ink` tokens.

Status colors (green connected/observed, red error, amber caution) were kept —
they're information, not brand.

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
- **Preview-pane `requestAnimationFrame` is frozen** (measured: a bare
  `requestAnimationFrame` callback never fires; `document.hasFocus()` is
  `false`). It's a background tab — so this hits **every** page, not just the
  WebGL ones. Consequences: no rAF-driven motion (marquees, GSAP reveals,
  starfield) can be observed, and screenshots time out. Verify via
  DOM/computed-style reads instead.
- **`:focus` styles don't paint** for the same reason — assert the class is
  present (`className.includes("focus:border-accent")`), not the computed color.
- **Global radius-0 is enforced in CSS** (`* { border-radius: 0 !important }`),
  so leftover `rounded-*` classes are already visually flat — the real migration
  work is killing **glass** (`bg-white/*` + `backdrop-blur`) and **orange**.

## 3.5 Status — ✅ complete

**Align was the last surface** (Session 26): `pages/Align.jsx`,
`alignment-mode/*` (AlignmentMode, EdgeStateLayer, GuidanceChrome,
TargetSelect), the alignment sensor panels, `MarkObservedChip`, `NetworkStatus`,
`AlignLab`, `CountdownTimer`, `utils/weather.js`, and the dev console banner
colour. **The final sweep is clean** — zero `#FF8C1A` / `orange-` /
`backdrop-blur` / `#090B10` / `#AAB4C5` left in `src/`.

**The alignment canvas** (`scene/draw.js`) has its own colour language —
white = structure, accent = the thing you're chasing, green = lock. `ORANGE`
became `ACCENT = [30, 99, 255]` — the **bright** `#1E63FF`, not the base
`#0049CD`: those sprites are luminous, composited with `lighter` on a
near-black canvas, and the base blue is too dark to read as a glow there.

Verified: `/align` live in the pane (it's a public route) — black canvas,
`#111214` card, `#232427` hairline, radius 0, `backdropFilter: none`, Satoshi.
`/align-lab` loads with canvas + chrome. **Not** pixel-verified: the scene only
paints with a live orientation feed, so the canvas blue is confirmed at source
rather than by sampling rendered pixels.

**Intentional exceptions (don't "fix" these):** `QRCodeModal` keeps `bg-white`
(the QR must stay scannable) and its `bg-white/40` expired overlay; the
`profile/Avatar` identity tints stay multi-hue; `AuthTest`/`SocketTest` are dev
consoles deliberately outside the design system.

> **Note:** the entire redesign is **uncommitted** in the working tree,
> alongside the Day-10 feature work.

---

# Part 4 — Community (Feature 6, complete: A + B + C)

Feature 6 — "who observes near me?" and "talk to them" — built entirely on the
gateway + frontend (zero astronomy), and unblocked by Day 9's profiles +
privacy. **Phase A (discovery)** needed no schema change at all; **Phase B
(chat rooms)** added two collections and one denormalized user field;
**Phase C** added pings, blocks and reports — and reshaped the room model.

## 4.1 Phase A — Discovery (gateway)

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

## 4.2 Phase A — Discovery (frontend)

`community.service.js` → `useNearbyObservers(radiusKm)` (React Query, keyed by
radius, `placeholderData: prev` so chip taps don't flash empty) →
`pages/Community.jsx` (protected, in `AppLayout`; added to `APP_PATHS`, lazy
route, navbar link). Components `community/{ObserverCard, RadiusSelector}`;
cards link to `/observers/:username` and reuse `profile/Avatar`. Every state
handled: loading skeletons, error, `gate=private` (→ `/profile`),
`gate=no-location` (→ `/dashboard`), empty range, and the results grid.

## 4.3 Phase B — Regional chat rooms

### The socket-auth correction (the load-bearing discovery)

`UPCOMING_FEATURES.md` assumed chat could reuse the existing socket server
because "the handshake already carries the session cookie." **It doesn't.**
`io.use(socketMiddleware)` gates the DEFAULT namespace on a *pairing* JWT bound
to a telescope `roomId` — a chat client has no such token, and loosening that
middleware would have weakened telescope pairing.

Chat therefore runs on its **own `/community` namespace** with independent
cookie auth (`socket.handshake.headers.cookie` → `jwt.verify` → `User`).
Namespace middleware does not inherit `io.use()`, so the alignment/pairing
sockets are untouched — proven by a regression suite, not assumed.

### Rooms

| Piece | What |
|---|---|
| `utils/geohash.js` | In-house base32 encode (**no new dependency**); precision 4 ≈ 39 km cells |
| `models/Room.js` | `key` (`geo:<hash>` / `global:first-light`), `kind`, `geohash`, `name` — created lazily, named once via `$setOnInsert` |
| `models/Message.js` | `{ room (key), user, body ≤500 }`, index `{room, createdAt}` |
| `User.geohash4` | Denormalized cell, set on location save, lazily backfilled for legacy users |

Membership is **derived** from `User.geohash4`, never stored on the room, so a
member count cannot drift. Two rooms per observer: the global **#first-light**
and their own region. Authorization (`assertRoomAccess`) allows the global room
or *your own* cell only — otherwise every cell on Earth would be readable.

### Live layer

`sockets/communitySocket.js` — events `chat:join` / `chat:message` /
`chat:typing` / `chat:leave` in; `chat:joined` / `chat:message` /
`chat:presence` / `chat:typing` / `chat:error` out. History is REST
(`GET /community/rooms/:key/messages`), socket is live-only. Rate limit 5 msg /
10 s per user across tabs; `pruneRoom` trims to the newest 500 on insert.
Presence counts **distinct users**, not sockets, so three tabs is one observer.

### Frontend

`useRooms` (React Query) + `useChatRoom` (socket lifecycle) →
`pages/CommunityChat.jsx` at `/community/chat`, with
`community/{RoomSwitcher, MessageList, MessageComposer}`. MessageList does day
dividers + consecutive-author grouping and only auto-scrolls when the reader is
already near the bottom. Sends are **server-echoed rather than optimistic** — a
deliberate deviation from the plan (see Decisions).

## 4.4 Phase C — Pings, private rooms, and safety

### The room model changed (product directive)

The **global #first-light room was removed**. A single everyone-channel is the
hardest thing to moderate and the least useful — "is it clear over the river?"
only means something locally. In its place: **private 1:1 rooms behind a ping
request.**

This deliberately reverses the roadmap's "No DMs in v1 (moderation surface too
big)". The consent gate is *why* it's now tractable — you can't message a
stranger, only ask, and nothing exists until they accept. Every private room was
invited by its recipient, which is a far smaller surface than an open firehose.

Rooms are now: **your region** + **one room per accepted ping**.

| Piece | What |
|---|---|
| `models/Ping.js` | `from`/`to`/`note`/`status`; partial-unique index = one *open* request per direction, re-ping allowed after a decline |
| `models/Block.js` | Stored one-way (who pressed it), **enforced symmetrically** |
| `models/Report.js` | Snapshots the offending body — evidence outlives the 500-message prune |
| `utils/profanity.js` | Whole-word **mask**, not reject |
| `services/pingService.js` | send / list / respond; creates the room **only on accept** |
| `services/moderationService.js` | `blockedIdsFor` (shared primitive), block/unblock/list, report |

### Ping flow

A pings B → B sees it in their inbox → B accepts → room `dm:<idA>_<idB>` is
created (ids **sorted**, so the pair maps to one room regardless of who asked).
Only the *recipient* may respond — a sender accepting their own request would
defeat the whole gate. Pinging someone who already pinged you **auto-accepts**
rather than opening a mirror request. Declines are silent: the sender is never
told, because a "you were rejected" notification invites retaliation.

### Blocking is symmetric

Stored one-directional but always queried both ways (`blockedIdsFor`). A one-way
block would let the blocked party keep watching — exactly what someone blocking
harassment is trying to stop. So each disappears from the other in **discovery,
history, live messages, room lists, and pings**. The shared DM is *hidden, not
destroyed* — unblocking restores the conversation. Live delivery filters
per-socket (one block lookup per message, not per recipient).

### Profanity: masking, not rejecting

Whole-word matching only, and a short list. The classic failure is the
Scunthorpe problem — substring matching censoring innocent words, which in an
**astronomy** app very much includes *Uranus*. Tested: `class`, `assess` and
`Uranus` pass through untouched. Masking beats rejecting because a false
positive shouldn't eat someone's whole observation report.

## 4.5 Files

```
server-gateway/src/
  services/communityService.js
  controllers/communityController.js
  routes/community.routes.js          (registered in app.js)
  models/{Room,Message}.js            (Phase B; Room gained kind:"direct")
  models/{Ping,Block,Report}.js       (Phase C)
  utils/geohash.js                    (Phase B)
  utils/profanity.js                  (Phase C)
  services/{pingService,moderationService}.js   (Phase C)
  sockets/communitySocket.js          (Phase B/C; registered in sockets/index.js)
  models/Users.js                     (+ geohash4)
  controllers/userController.js       (compute geohash4 on location save)
frontend/src/
  services/community.service.js       (nearby + rooms + messages + pings + safety)
  services/socket.service.js          (+ createCommunitySocket)
  hooks/{useNearbyObservers,useRooms,useChatRoom,usePings}.js
  pages/{Community,CommunityChat}.jsx
  components/community/{ObserverCard,RadiusSelector,RoomSwitcher,
                       MessageList,MessageComposer,PingInbox}.jsx
  App.jsx, components/Navbar.jsx      (routes + link)
```

## 4.6 Decisions worth remembering

- **No global room; DMs behind a consent gate** (product directive) — see 4.4.
- **Chat is NOT gated on `profileVisibility`.** Discovery hides a private
  observer from being *found*; chat is something they opt into by speaking. The
  reciprocity gate applies to `/community` only.
- **Server-echo over optimistic send** (deviates from the plan): the server
  broadcasts to the room including the sender. One round-trip, but the stream
  only shows what actually persisted — a rate-limited send has no phantom to
  roll back.
- **500-message cap over a 30-day TTL:** a quiet regional room would erase
  itself between clear nights under a TTL.
- **Block hides, never destroys.** The DM room survives a block so unblocking
  restores the conversation rather than silently losing it.
- **Reports snapshot their evidence** — a report whose message got pruned is
  useless to whoever reviews it.
- **Geohash-4, no sparse merging** — the ping/DM path answers "my region is
  empty" better than merging cells would.

---

# New Dependencies

**None this day.** The redesign self-hosts the Satoshi font (static asset, not
an npm package) and reuses the already-installed GSAP / three.js. Community
adds no packages either — `$geoNear` is core MongoDB, socket.io was already
there, and the geohash encoder is ~30 lines written in-house rather than
pulling `ngeohash`.

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

## Community (Feature 6, all phases) — verified live in Session 26

Exercised end-to-end against a real gateway + Atlas on a throwaway port
(**54 assertions, all passing**), with seeded users removed afterwards. To
re-run the same checks by hand:

**Discovery**
- Two users ~10 km apart → both appear at 25 km; a `private` user never appears;
  a private *viewer* gets the reciprocity gate; no-location viewer gets the
  location gate. Payload contains no coordinates and no email.
- Distances render as bands (`~10 km`), never meters.

**Rooms + chat**
- Two users in one geohash-4 cell land in the same region room; a Delhi user
  gets a different one and gets **403** reading the other region's history.
- Both join → presence shows 2; a second tab does **not** inflate it; closing
  one tab keeps the user present; disconnecting drops it.
- A sends → B receives live; typing indicator relays; cross-region send refused.
- 6th rapid message is rate-limited and the spam does **not** persist.
- History is chronological, oldest-first.

**Pings + private rooms**
- No room exists before the recipient accepts; the DM is 404 (not 403) to
  outsiders — a private conversation must not confirm it exists.
- The sender cannot accept their own request (403). Duplicate ping → 409.
  Pinging someone who already pinged you auto-accepts. Self-ping → 400.
- The room key is order-independent, and each participant sees it named for the
  *other* person.
- A third party can neither read the DM over REST nor join it over the socket.

**Safety**
- Profanity is masked, not rejected — and `class` / `assess` / **`Uranus`** must
  pass through untouched (Scunthorpe check).
- Report: self-report 400; body is snapshotted; duplicate report is a no-op.
- **Block is symmetric:** each disappears from the other's discovery, messages
  are hidden from history, the shared DM leaves the room list, and the blocked
  user can't ping. Unblocking restores the DM (the room was hidden, not deleted).

**Regression (must stay green — Feature 6 must not disturb pairing)**
- Default namespace still rejects no/invalid pairing token, accepts a valid one,
  and `join_room` → `room_joined` still works.
- A session cookie cannot enter the pairing namespace; a pairing token cannot
  enter `/community`; `/community` rejects anonymous.

## Known caveats / environment traps

- **Redesign Align surface + final grep sweep are still pending.**
- Backend has no hot-reload — test on a throwaway port (`PORT=5055 node
  src/app.js`) rather than restarting a gateway another session may be using.
- **Preview-pane screenshots time out** on every page here; verify via
  DOM/computed-style reads instead.
- **`computer type` doesn't drive React controlled inputs** — the DOM value
  updates but React's `onChange` never fires, so state stays empty and the send
  button no-ops. Use `form_input` (or the native setter + `input` event).
- To point a test frontend at a test gateway: `VITE_API_LOCAL=http://localhost:5055`
  plus `CLIENT_URL=http://localhost:<vite-port>` on the gateway for CORS.

---

# What's Committed vs Pending

- **Everything on Day 10 is uncommitted** at the time of writing — the redesign
  (~40 modified + ~19 untracked files) and the Community Phase A + B files share
  the working tree on `feature/user-profiles`.
- Session-by-session detail lives in the assistant's project memory
  (`redesign-v2-bento-blue`, `first-light-guide`, `community-discovery`).

---

# Next

Per `UPCOMING_FEATURES.md`:

1. **Finish Redesign v2** — convert the Align surface, then the final orange/
   glass grep sweep. This is the last thing standing between the app and a
   consistent look, and the only unfinished arc of Day 10.
2. **Report review UI** — `Report` docs now accumulate with `status: "open"` and
   nothing surfaces them. Feature 6 is otherwise complete; this is the natural
   next moderation step (an admin-only queue; the `role: "admin"` field already
   exists on the user).
3. **Commit the tree** — Day 10 is ~70 uncommitted files across two arcs
   (redesign + community); they should land as separate commits.

With Feature 6 done, the roadmap's next fuel-dependent systems (Feature 7
Notifications, Feature 8 AI Recommendations) are unblocked — both wanted
profiles + planner history, which now exist.

Later systems (Notifications, AI Recommendation Engine) still depend on the
planner history and profiles as their fuel.
