# UPCOMING_FEATURES.md

# 🌌 SkyGuide AI — The Build Queue

> **The living, sequenced plan for every upcoming feature.**
> Written 2026-07-11 (Session 18). Supersedes the stale parts of
> `PROJECT_ROADMAP.md` — that file describes phases that already shipped;
> this one describes only what's next, in enough detail that any future
> session can pick up a feature and build it without re-deriving decisions.

**How to use this file:** work top to bottom — the order encodes dependencies
(e.g. Profiles must exist before Community; History must exist before the ML
recommender has training data). Each feature lists objective, UX, architecture
(respecting the gateway/engine split from `CLAUDE.md`), data model, endpoints,
frontend work, testing steps, and open decisions. When a feature ships, mark
it ✅ with the session number and move on.

**Current backend state (Session 18):** moon-aware visibility scoring with
airmass/moon-separation/rise-set per object, filled moon & conditions fields,
`/api/v1/observations` planner CRUD (gateway), `/api/v1/satellites/passes`
(ISS via Skyfield). None of it is consumed by the frontend yet — that's
deliberately Feature 1.

---

# Feature 1 — Observation Planner UI (complete the core loop)

**Status:** ✅ Shipped (Session 19) — observation.service.js + useObservations,
AddToPlanButton (drawer/ledger/top-5), PlannerCard (live status, notes,
history, life-list progress), MarkObservedChip on alignment lock. Also fixed
a gateway race (PATCH on a just-deleted entry now 404, was 500).
**Depends on:** nothing — everything needed is live
**Effort:** 1 session

## Objective

Close the product's central loop: *decide → point → log*. The user builds
tonight's queue, observes, and marks results — turning SkyGuide from a
read-only report into a tool that accumulates a life history.

## UX

1. Every object surface gets an **"Add to plan"** action: the `/tonight`
   object drawer, the Deep-Sky Ledger rows, and the dashboard's top-5 rows.
   Already-planned objects show a subtle "On plan ✓" state instead (409 from
   the API = already planned).
2. New **Planner card** on the dashboard (Tonight-at-a-glance grid):
   planned objects with live visibility (visible now / sets at HH:MM / below
   horizon), one-tap **Observed** / **Skip**, inline notes on tap.
3. **History view**: a tab or section listing resolved entries newest-first,
   plus a progress stat ("23 / 110 Messier objects observed") — computed by
   intersecting history with the catalog list.
4. In **Alignment Mode**, when a target reaches lock, offer a one-tap
   **"Mark observed"** chip (writes `status: observed` with zero typing).

## Architecture

- New `frontend/src/services/observation.service.js` → gateway
  `/api/v1/observations` (cookie auth, so through the gateway base URL).
- New hook `useObservations()` (React Query: list + add/update/remove
  mutations with optimistic updates; invalidate on settle).
- Components: `dashboard/PlannerCard.jsx`, `tonight/fx` reuse for rings;
  "Add to plan" is a small shared button component
  (`components/plan/AddToPlanButton.jsx`) so drawer/table/dashboard stay DRY.
- Merge live visibility into planned entries client-side by `catalog_id`
  (same pattern as `useTonight`'s catalog merge).

## Testing

Add from drawer → appears in Planner card → duplicate add shows "On plan ✓" →
mark observed → moves to history with timestamp → re-add works → notes persist
after reload. Edge: planned object below horizon shows "rises at HH:MM".

---

# Feature 1.5 — Target Panel, Guided Observing & Dashboard IA v2

> Numbered 1.5 (not renumbering everything) so existing cross-references in
> this file stay valid. **User directive, Session 20** — this reshapes the
> core UX and outranks everything below it.

**Status:** 🔄 In progress (Session 20)
**Depends on:** Feature 1 ✅
**Effort:** 1–2 sessions

## Objective

Give every celestial object a **first-class page** and make "observe this"
a single guided pipeline. Clicks stop opening side drawers; they go to a
dedicated target panel that owns the details AND the "Start Observing"
journey (telescope → pairing → alignment, auto-targeted).

## UX spec (from the product owner)

1. **Detailed Target Panel** — route `/tonight/:id` (e.g. `/tonight/M42`):
   big hero image (graceful type-glyph fallback until real media lands),
   full details (score, live alt/az/airmass/moon separation, how long it
   stays visible / sets-at, physical data, description, tips), Add-to-plan,
   and a **START OBSERVING** button. Later: AI analysis, observation history.
2. **START OBSERVING flow** (the panel's button):
   - No telescope configured → `/dashboard?observe=<id>` scrolls to +
     highlights the Telescope card.
   - Telescope but no phone paired → same redirect, highlights the Sync
     card (QR pairing).
   - Paired → the dashboard auto-fires `alignment:set_target <id>` and opens
     Alignment Mode — the user never picks the target manually.
   (The overlay must stay inside the Dashboard's PairingProvider tree —
   that's why the flow routes through the dashboard rather than mounting
   alignment on the panel route.)
3. **Dashboard IA v2** — new order: greeting → **Observer Location** (first;
   permission/manual flow) → **Telescope** (configure now or later) →
   Tonight at a Glance (rows → target panel) → **The Moon** → **All-Sky
   Chart** (type filters; hover = readout, click = target panel) →
   Observing Conditions → **Plan** (rows → target panel; Start Observing
   from there too) → pairing/orientation/alignment ops cards last.
4. **/tonight page** — every object click (top targets, ledger, dome)
   navigates to the target panel. The side ObjectDrawer is retired.
5. **Navbar** — Home · Tonight · Dashboard (Profile joins with Feature 4).

## Architecture

- `hooks/useTargetDetail.js` — resolves one object by catalog_id from the
  useTonight cache (targets ∪ belowHorizon), so the panel is instant when
  navigated from anywhere in-app and self-hydrating on a cold URL.
- `pages/TargetPanel.jsx` (lazy, protected) + `components/target/*`.
- Start Observing = navigate to `/dashboard?observe=<id>`; a small
  `ObserveFlowController` inside the Dashboard reads the param, checks
  `useTelescope().hasTelescope` → `useAlignmentFeed().paired`, scrolls/
  highlights the right card, and when ready calls `feed.setTarget(id)` +
  auto-opens Alignment Mode (via a `launchTarget` prop on
  AlignmentPanelCard), then clears the param.
- SkyDome gains local type-filter chips (shared TYPE_META), works in both
  compact and full modes.
- **Deferred within this feature:** the Moon as a *guidable* target (the
  alignment engine tracks catalog objects; pointing it at the Moon needs an
  engine-side ephemeris target type — noted for the backend backlog).

## Testing

Cold-load `/tonight/M42` renders full dossier; from dashboard glance →
panel → back. Start Observing with no telescope highlights Telescope card;
with telescope highlights Sync; when paired, alignment opens already
tracking the target. Dome filters cut the plotted set. No drawer remains
on /tonight. Planner rows link to panels.

---

# Feature 2 — Auth UX completion: password reset + smooth signup

**Status:** ⏳ Backend ✅ (endpoints exist) · Frontend pending
**Depends on:** nothing
**Effort:** 1 session

## Objective

The gateway already exposes `POST /auth/forgot-password`,
`PATCH /auth/reset-password/:token`, `GET /auth/verify-email/:token`,
`POST /auth/resend-verification` — but there are **no frontend pages** for
any of it. Right now a user who forgets their password is stuck, and signup
requires four manual context switches.

## UX

1. **Forgot password:** "Forgot password?" link on the login card → email
   input → success state ("If that account exists, a reset link is on the
   way") — same copy on success and unknown email (no account enumeration).
2. **Reset password page** (`/reset-password/:token`): new password + confirm,
   strength hint, inline validation, then auto-redirect to login with a
   success toast. Expired/invalid token → clear error + "request a new link".
3. **Verification-aware signup:** after registering, land on a
   "Check your inbox" screen that **polls `/auth/me` every ~5s**; the moment
   the user clicks the email link (opens in a new tab), the original tab
   detects the session and slides straight into the dashboard onboarding.
   Include a "Resend email" button (rate-limited server-side already).
4. **Unverified login attempt** (403 "verify your email first") gets a
   dedicated inline state with the resend button — not a generic error.

## Architecture

- Pages: `pages/ForgotPassword.jsx`, `pages/ResetPassword.jsx`,
  `pages/VerifyEmail.jsx` (the "check inbox" poller). All standalone glass
  cards on the starfield, same visual language as LoginPage.
- Extend `services/auth.service.js` with `forgotPassword`, `resetPassword`,
  `resendVerification` (endpoints exist — service functions only).
- The email templates live in the gateway (nodemailer) — check the reset URL
  in the email points at the **frontend** route, not the API route
  (`network.js` handles the base URL).

## Testing

Full loop with a real inbox: forgot → email → reset → login with new
password. Expired token path. Unverified login → resend → verify → poller
advances. Rate limiter still fires on hammering resend.

---

# Feature 3 — Consume the Session-18 science (set times, airmass, ISS)

**Status:** ⏳ Backend ✅ · Frontend pending
**Depends on:** nothing (pairs well with Feature 1 in the same session)
**Effort:** 0.5–1 session

## Objective

Surface the new per-object and satellite data everywhere decisions happen.

## UX / scope

1. `/tonight` object drawer: add **"Sets at HH:MM (in X h)" / "Circumpolar —
   up all night"**, airmass, and moon separation rows; a subtle urgency tint
   when `hours_until_set < 2`.
2. Deep-Sky Ledger: optional columns — airmass, moon sep, sets-at. Sort by
   `hours_until_set` = "catch these first" view.
3. Dashboard TonightGlance rows: replace the static magnitude line with
   "sets 23:41" when within ~4 h — it's the more actionable fact.
4. New **ISS pass card** (dashboard, future-cards slot): next pass —
   rise/peak/set local times, peak altitude, duration; countdown chip when
   < 3 h away ("Overhead in 1 h 42 m"). Service: `satellite.service.js` →
   astro engine `POST /api/v1/satellites/passes` (public, direct call).
5. Moon panel: show `lunar_target_score` ("Great telescope target tonight —
   terminator detail 82/100") and supermoon badge when true.

## Testing

Drawer shows set time matching the table; ISS card matches
`curl /satellites/passes`; countdown ticks; circumpolar objects say so
instead of showing nulls.

---

# Feature 4 — User Profile: avatar, bio, public identity

**Status:** ✅ Shipped (Session 23). `/profile` (editable: avatar, display
name, bio, 3-way visibility, approx-location toggle, observing résumé) and
`/observers/:username` (public, visibility-gated). Gateway: profileService +
controller, `/users/me/profile`, `/users/me/avatar`, `/observers/:username`
(optionalAuth), reverse geocoding on location save (Nominatim, built-in https,
best-effort). Verified: edit/save persists, every visibility gate (private→404,
observers→403 anon, unknown→404, owner always 200), and public payload leaks no
email/coordinates.

**Deviation from the plan below:** avatars are **client-cropped 256px data URLs
stored inline on the user doc** (canvas crop → WEBP/JPEG ≤200KB), NOT Cloudinary
— chosen to ship credential-free. `avatarPublicId` field + the `POST
/users/me/avatar` endpoint are the clean swap-in points for a CDN later. The
Cloudinary write-up below is kept as the future migration target.
**Depends on:** nothing; **prerequisite for Feature 6 (Community)**
**Effort:** 1–2 sessions

## Objective

Give every observer an identity: profile picture, bio, display name, gear,
and an automatic observing résumé (from Feature 1's history). This is the
foundation the community features stand on.

## UX

1. **Profile page** (`/profile`, own) and **public profile** (`/observers/:username`):
   avatar, display name, @username, bio (≤ 280 chars), location shown as
   **city/region only** (never exact coordinates — privacy), member-since,
   telescope summary, observing stats (objects observed, favorite type —
   derived from history), recent observed list.
2. **Edit mode** on own profile: avatar upload with crop preview, bio,
   display name; changes save with optimistic UI.
3. **Privacy controls** (must ship with, not after): profile visibility
   toggle `public | observers-only | private`, and "show my approximate
   location" toggle (default ON but coarse). These gates matter because
   Feature 6 matches people by location.

## Architecture

- **Avatar storage decision:** Cloudinary (free tier, `f_auto,q_auto`,
  on-the-fly resize) — the frontend already leans on Cloudinary conventions
  in the design guardrails. Gateway holds the API secret; upload flow is
  browser → gateway (`multer` memory) → Cloudinary → store `secure_url` +
  `public_id` on the user. Enforce ≤ 2 MB, jpeg/png/webp, square-crop
  client-side. (Alternative rejected: local disk — breaks on multi-instance
  deploy.)
- User schema additions: `displayName`, `bio`, `profileVisibility`,
  `showApproxLocation`, `avatarPublicId` (avatar URL field exists).
- New endpoints (gateway):
  - `GET  /api/v1/users/me/profile` — own full profile
  - `PATCH /api/v1/users/me/profile` — displayName/bio/privacy
  - `POST /api/v1/users/me/avatar` — multipart upload (rate-limited)
  - `GET  /api/v1/observers/:username` — public view (respects visibility;
    404 for private, never "this account is private" — no existence leak)
- Reverse geocoding for the "city/region" label: one-time on location save,
  via a free geocoder (Nominatim with proper User-Agent, cached on the user
  doc in the existing `location.city/state/country` reserved fields —
  `utils/location.js` already renders them when present).
- Frontend: `pages/Profile.jsx`, `pages/PublicProfile.jsx`,
  `components/profile/*` (AvatarUploader, StatsBand, HistoryList reusing
  Feature 1's components), `services/profile.service.js`.

## Testing

Upload avatar (size/type rejects), edit bio, view own vs. public profile,
privacy toggles actually gate the public route, city label appears after a
location save, no exact coordinates anywhere in public payloads.

---

# Feature 5 — Step-by-step Guidance page ("First Light Guide")

**Status:** ✅ Shipped (Session 24). Public `/guide` route: 9-step scroll page
in the /tonight visual language (starfield + useReveal), sticky `GuideRail`
that doubles as a checklist, per-step deep-link CTAs. Content in
`components/guide/guide.steps.jsx`; completion detection in `useGuideProgress`
(from auth/location/telescope/observations — no new backend; anonymous reads
all-incomplete). Signed-in users get a progress bar + green ticks on the six
trackable steps. Entry points: home nav "Guide", in-app navbar "Guide", and
the dashboard empty-location card. **No new dependencies** (reuses GSAP/three).
**Verified:** anonymous render (9 steps/rail/CTAs, no console errors), rail
scroll offset math, lint + build. **Not live-verified:** the signed-in
checklist path — the Atlas DB was unreachable (DNS `ESERVFAIL`) at session end,
so login/user-state couldn't be exercised; logic is a straightforward read of
already-verified hooks.
**Depends on:** nothing (update it as later features ship)
**Effort:** 1 session

## Objective

A beautiful, linear walkthrough that takes a brand-new user from "I just
signed up" to "the target is in my eyepiece" — and doubles as the product
tour for visitors (public route, linked from the landing page and the
dashboard's empty states).

## UX

`/guide` — an immersive scroll page in the /tonight visual language
(starfield, GSAP scroll reveals), with a sticky step rail:

1. **Create your account** — verification explained.
2. **Set your observing location** — GPS vs. manual, why precision matters,
   privacy note.
3. **Add your telescope** — where to find aperture/focal length on the tube,
   what each number changes.
4. **Read your dashboard** — annotated screenshot tour: sky score, moon,
   top-5, all-sky chart (each annotation as a spotlight card).
5. **Explore Tonight** — scores explained in plain language (what 80 means,
   why the Moon lowers it), the ledger, dossiers.
6. **Plan your session** — the planner loop (after Feature 1).
7. **Pair your phone** — QR flow with photos, phone-mounting tips.
8. **Align and observe** — Alignment Mode walkthrough, what "locked" means.
9. **Log it** — mark observed, notes, your growing life list.

Each step: one hero visual, ≤ 120 words, a deep-link button ("Set location
now →"). Steps detect completion for logged-in users (location set? telescope
saved? phone ever paired?) and show ✓ — the guide becomes a checklist.

## Architecture

- `pages/Guide.jsx` (lazy route) + `components/guide/*`; content as a data
  file (`guide.steps.js`) so copy edits never touch layout.
- Completion detection from existing state only (user doc, telescope query,
  pairing history) — no new backend.
- Contextual entry points: dashboard empty states link to the relevant step
  (`/guide#pair-your-phone`).

## Testing

Anonymous view renders all steps; logged-in user with location set sees
step 2 checked; every deep link lands on the right surface; mobile scroll
(inner-scroller trap doesn't apply — this is a window-scroll route).

---

# Feature 6 — Community: nearby observers + location chat rooms

**Status:** ✅ **Shipped (Session 26)** — Phases A, B and C.

> **Product change (user directive, Session 26):** the **global #first-light
> room is REMOVED**. A single everyone-channel is the hardest thing to moderate
> and the least useful ("is it clear over the river?" only means something
> locally). In its place, **private 1:1 rooms gated by a ping request**: you ask
> an observer to talk, and only if they accept does a room exist for the pair.
> This *reverses* the "No DMs in v1" note below — the consent gate is precisely
> what makes DMs tractable, since every private room was invited by its
> recipient. Rooms are now: **your region** + **one room per accepted ping**.

**Phase A — Discovery ✅.** Gateway `GET /api/v1/community/nearby?radius=`
(`$geoNear` over the users' 2dsphere index; reciprocity + privacy gates
enforced server-side; returns coarse **distance bands**, never coordinates).
Frontend: `community.service.js`, `useNearbyObservers`, `pages/Community.jsx`
(protected, in AppLayout) + `components/community/{ObserverCard,RadiusSelector}`,
navbar link. No schema change — the 2dsphere index +
`showApproxLocation`/`profileVisibility` already existed.

**Phase B — Regional chat rooms ✅.** `utils/geohash.js` (in-house base32
encode, no new dep), models `Room` + `Message`, `User.geohash4` (set on location
save, lazily backfilled), `communityService.{listRooms,getMessages,postMessage,
assertRoomAccess}`, REST `GET /community/rooms` + `/community/rooms/:key/messages`,
and `sockets/communitySocket.js`. Frontend: `useRooms`, `useChatRoom`,
`pages/CommunityChat.jsx` (`/community/chat`) +
`community/{RoomSwitcher,MessageList,MessageComposer}`,
`createCommunitySocket()`.

> ⚠️ **Correction to the architecture note below:** the socket handshake does
> **not** "already carry the session cookie" in a usable way. `io.use(socketMiddleware)`
> gates the DEFAULT namespace on a *pairing* JWT bound to a telescope `roomId` —
> a chat client has none. Chat therefore runs on its own **`/community`
> namespace** with independent cookie auth. Namespace middleware does not
> inherit `io.use()`, so the alignment rooms are untouched (regression-tested).

**Phase C — Pings, safety ✅.** Models `Ping` / `Block` / `Report`;
`pingService` (send / list / respond, creates the private room on accept only);
`moderationService` (`blockedIdsFor` — the shared primitive; block/unblock/list;
report with an evidence snapshot); `utils/profanity.js` (whole-word MASK, not
reject). Endpoints: `POST|GET /community/pings`, `PATCH /community/pings/:id`,
`GET|POST /community/blocks`, `DELETE /community/blocks/:username`,
`POST /community/reports`. Socket: personal `user:<username>` channel for live
`ping:new` / `ping:accepted`; message fan-out is per-socket when a block is
involved. Frontend: `usePings`, `PingInbox`, Ping button + state on
`ObserverCard`, report/block actions on `MessageList`.

**Verified live (Session 26)** against a real gateway + Atlas on a throwaway
port — **54 assertions** across four suites, test data removed afterwards:
- *Discovery:* banding, private hidden, reciprocity gate, no coordinate/email leak.
- *Rooms/chat:* shared cell, cross-region read → 403, cookie auth, live delivery,
  typing, presence (multi-tab dedupe + disconnect decrement), rate limit (6th
  refused, spam not persisted), history REST.
- *Phase C:* no global room; ping gate (no room before accept, sender can't
  accept their own, third party 404 on read AND socket join, mutual ping
  auto-accepts, duplicate 409); profanity mask incl. Scunthorpe checks
  (`class` / `assess` / `Uranus` untouched); report (self 400, snapshot,
  duplicate no-op); **block is symmetric** (gone from BOTH users' discovery,
  messages hidden, shared DM hidden then restored on unblock, blocked user
  can't ping).
- *Regression:* the pairing namespace still enforces its token and `join_room`
  works; the two auth models reject each other both ways.

UI verified in-pane: ping inbox → **Accept creates the room live**, ping states
(Ping / Requested / Connected), report notice, and **block removes the author's
messages from the stream + their DM from the list** without a page reload.

**Depends on:** Feature 4 (profiles + privacy) — HARD dependency
**Effort:** 2–3 sessions (a: discovery ✅, b: chat ✅, c: pings + safety ✅)

## Still open (deferred, not blocking)
- **No admin review UI for reports.** `Report` docs accumulate with `status:
  "open"`; nothing surfaces them yet. That's the natural next moderation step.
- **Sparse-cell merging** for regions was never needed — the ping/DM path covers
  "my region is empty" better than merging would.
- Presence is per-room only; there's no global "N observing tonight" strip.

## Objective

Connect observers who share a sky. Two pillars: **discovery** ("who observes
near me?") and **regional chat rooms** ("talk to them"), so a Kolkata
observer can ask "is it clear toward the river tonight?" and get a real
answer.

## UX

1. **Observers Nearby** (`/community`): cards of public profiles within a
   chosen radius (25 / 50 / 100 km), sorted by distance band ("~12 km away" —
   never exact), each showing avatar, name, gear, observed-count. Joining
   requires `profileVisibility != private` — the page explains why and
   deep-links to privacy settings.
2. **Regional rooms:** auto-assigned by geohash cell (roughly city-scale,
   e.g. geohash precision 4 ≈ 39 km cells, merged with neighbors under a
   member minimum) — "SkyGuide · Kolkata region". One room per region.
   ~~plus a global **#first-light** room for everyone. No DMs in v1 (moderation
   surface too big).~~ **SUPERSEDED (Session 26):** no global room; DMs exist
   but only behind a ping/accept consent gate — see the Status block above.
3. **Chat UI:** right-drawer or `/community/chat` — message list with day
   dividers, avatars, "N observing tonight" presence strip (members with the
   app open), typing indicator. Push a "planning to observe tonight 🔭"
   status chip from the dashboard.
4. **Safety v1:** report message, block user (hides both directions),
   rate-limit (5 msg / 10 s), profanity filter on the gateway, room history
   capped at last 500 messages.

## Architecture

- **Discovery (gateway):** `GET /api/v1/community/nearby?radius=50` —
  `$geoNear` on the existing `2dsphere` index over users, filtered by
  visibility + showApproxLocation, returning distance *bands* not meters.
- **Rooms (gateway + socket.io):** reuse the existing socket server — new
  namespace or event family (`chat:join`, `chat:message`, `chat:presence`)
  alongside the alignment events (do NOT touch the alignment rooms).
  Auth: socket handshake already carries the session cookie.
- **Persistence:** new `messages` collection
  `{ room, user, body ≤ 500 chars, createdAt }`, TTL/prune policy; new
  `rooms` collection derived from geohash cells
  `{ geohash, name, memberCount }`. Room assignment computed on location
  save (store `user.geohash4`).
- **History fetch** REST: `GET /api/v1/community/rooms/:id/messages?before=` —
  socket is for live only, history over HTTP (simpler pagination).
- Frontend: `pages/Community.jsx`, `components/community/*`,
  `services/community.service.js`, `hooks/useChatRoom.js` (socket lifecycle,
  optimistic send, reconnect replay).
- **Do not** touch the existing ChatWidget (AI assistant) — different
  product surface; keep naming distinct (`community chat` vs `AI chat`).

## Open decisions — SETTLED (Session 26)

- **Geohash precision 4** (~39 km cells) — as leaned. Encoder verified against
  the canonical reference; cells measure ~24–36 km wide depending on latitude.
  No sparse-cell merging implemented yet: it only matters once real users
  exist, and the global #first-light room already covers "my region is empty".
- **500-message cap** (not a 30-day TTL) — as leaned. A quiet regional room
  would erase itself between clear nights under a TTL; a cap keeps history
  intact however slowly the room moves. Enforced by `pruneRoom` on insert.
- **Presence: socket-connection-based only**, no "last seen" — as leaned.
  Counts distinct *users*, not sockets, so multiple tabs is still one observer.
- **Chat is NOT gated on `profileVisibility`** (new decision): discovery hides a
  private observer from being *found*, but chat is something they actively opt
  into by speaking. The reciprocity gate applies to `/community` only.
- **Sends are server-echoed, not optimistic** (deviates from the architecture
  note below): the server broadcasts each message to the room including the
  sender. Costs a round-trip, but the stream only ever shows what actually
  persisted — a rate-limited send has no phantom to roll back.

## Testing

Two seeded users 10 km apart see each other at 25 km radius; private user
never appears; both land in the same room and exchange messages live
(two browser contexts); block hides both ways; rate limiter trips; history
paginates; alignment sockets unaffected (regression: run a pairing session).

---

# Feature 7 — Notifications & daily alert system

**Status:** ✅ **Complete.** Phase 7a shipped (Session 26) — notification engine,
daily digest (in-app + email), in-app centre. **Phase 7b shipped (Session 29)** —
all four remaining alert types.

**7b shipped:** `services/alertService.js` (the four triggers, pure evaluation —
returns descriptors, writes nothing) + `jobs/alertsJob.js` (**node-cron
`5,20,35,50 * * * *`**, offset from the digest's quarter-hours so the two jobs
don't hit the engine together; selects on LOCAL hour **18:00**). Two new prefs
`planUrgency` / `moonEvents` (**default ON**, unlike greatNight/issAlerts — they
fire rarely and only in-app) + toggles on the profile page. No new dependencies.

**The alert hour is 18:00 local and NOT a user preference.** The digest is a
message you schedule; an alert's timing is dictated by the sky. 18:00 is chosen,
not arbitrary: the engine's weather is a **nowcast with no forecast endpoint**,
so a "great night" reading is only as honest as its distance from the night —
18:00 is at/after sunset for most observers most of the year, a 12 h ISS window
from it covers the whole usable night, and it lands *after* the default digest
(digest plans the evening; the alert interrupts it).

**Trigger definitions** (all thresholds are module constants in `alertService`):
| Alert | Trigger | sentKey | Channel |
|---|---|---|---|
| **Great night** | `observing_score >= 75` | `great_night:<localDate>:<user>` | in-app + email |
| **ISS pass** | soonest **visible** pass, peak >= 40°, in 12 h | `iss_pass:<localDate>:<user>` | in-app + email |
| **Plan urgency** | planned object scores >= 35 at 22:00 local tonight but < 35 at 22:00 in 14 days | `plan_urgency:<id>:<YYYY-MM>:<user>` | in-app |
| **Moon** | illumination <= 5% (new-moon window), or `reserved.supermoon` | `moon:new\|supermoon:<lunation>:<user>` | in-app |

**Engine change (required, not scope creep): `/satellites/passes` now knows what
"visible" means.** It was purely geometric, so it happily reported a 69°-altitude
**midday** ISS pass — the alert would have sent observers outside to look at an
invisible satellite. Passes now carry `sunlit` / `observer_dark` / `visible`
(cylindrical Earth-shadow model + Sun altitude <= -6° at the observer, both judged
**at peak**, using Astropy's builtin solar ephemeris — no new download), plus an
additive `visible_only` request flag (**defaults false**, so the existing contract
and the raw geometry are preserved; the alert opts in). Verified against physics:
London 72 h → 5 visible, all 22:07–23:45 (post-dusk); Sydney → 1, at 06:12 (dawn);
Kolkata → 0 in 72 h (plane not aligned). Never visible at noon or midnight.

## TRAPS for future sessions
- **Engine pass times JITTER between calls.** `peak.utc` is re-solved from each
  call's window start and moves by milliseconds. **Four ticks fall inside the
  alert hour**, so a sentKey built from `peak.utc` is four different keys and the
  uniqueness guard never fires → four identical alerts. Keyed on the local DATE
  instead. Any future "key it by the event's timestamp" idea has this bug.
- **`*/15` inside a JS block comment terminates it** (`*/`). Cost a syntax error
  while writing `alertsJob`; `digestJob` says "every 15 minutes" in prose for the
  same reason.
- **The id-as-name fallback duplicates**: only ~30 of 110 catalog objects have a
  common name, so `${name} (${id})` renders "M4 (M4)". `alertService.nameOf()`
  returns `{display, full}` and adds the id only when it says something new.
  ⚠️ **`digestService.renderEmailText` still has this defect** (pre-existing, 7a).
- `digestService.catalogNames()` is now exported and SHARED — don't warm a second
  catalog cache.
- Verification recipe: vite reported port ≠ actual port (**read the vite log** —
  harness said 55564, vite used 5174) and the gateway's CORS needs the real one.
  Screenshots still freeze in a hidden pane; text tools work fine.

**Verified live (Session 29) — 55 assertions** against a real astro engine + Atlas,
plus 33 pure-logic assertions (DST both directions at 5 zones with a no-DST
control; the lunation key across a new moon). Covered: every pref gate; the moon
trigger firing for real (the Moon was 4.8% lit that day); great-night and ISS
staying silent *in agreement with the engine's own numbers*; **no alert for a
bright-but-invisible pass**; the ISS firing path against a real captured London
payload; **4 jittering ticks → 1 stored row**; plan-urgency fading-vs-stable
driven by the engine's own two sky snapshots, and the 2-per-night cap;
idempotency; no-location users skipped not crashed; off-hour users skipped.
UI verified in-pane: both toggles render, persist to Atlas, don't disturb their
neighbours — and toggling `moonEvents` off in the browser really does silence the
trigger in the job (and back on restores it). All test data removed.

> **Still open:** `plan_urgency` compares tonight vs +14 days at a fixed 22:00
> local. It cannot see *why* an object fades (season vs. a transient), and it says
> nothing about objects that are already gone. A proper "best window this year"
> would need a multi-night engine sweep — deliberately not built.

**7a shipped:** `models/Notification` (`sentKey` unique index = the idempotency
guard), `notificationPrefs` on the user, `services/notificationService`
(idempotent create + live push), `services/digestService` (composition only —
no astronomy), `jobs/digestJob` (**node-cron**, `*/15 * * * *`, selects by the
observer's LOCAL hour), `sockets/notificationSocket` (`/notifications` namespace),
and `middleware/socketSessionAuth` (extracted — `/community` now shares it).
astroEngineClient gained `fetchObservable` / `fetchMoon` / `fetchCatalog`.
Endpoints: `GET /api/v1/notifications`, `PATCH /:id/read`, `PATCH /read-all`,
`GET|PATCH /preferences`. Frontend: `notification.service`, `useNotifications`
(React Query + live socket merge), `NotificationBell` (navbar, unread badge,
dropdown), `NotificationPrefs` (profile page).

> **Only new dependency in Feature 6+7: `node-cron`** (the scheduler this file
> chose). `DISABLE_CRON=true` disables scheduled jobs — **always set it on a
> throwaway gateway**, since those share the production DB and would otherwise
> email real observers from a test process.

**Verified live (Session 26) — 60 assertions** against the real gateway + astro
engine + Atlas: digest composition, rendering (grounded — no null/undefined
leaks), **idempotency** (second send for the same day is a no-op; re-running the
tick never double-sends), **local-hour selection** (IST vs UTC differ; wrong
hour / digest-off / no-location users are skipped, not crashed), the
notification API (cross-user read → 404, anon → 401, no `sentKey` leak),
preferences (defaults, range validation, route ordering), and the **live socket
push** (per-user channel — one observer never receives another's; duplicates
don't re-push). Regression: `/community` and the pairing namespace both
unaffected by the shared-middleware refactor.

**Three bugs the live engine caught** (all fixed): the visibility endpoint
returns `name: null` for most objects (names live in the **catalog**, which must
be merged by catalog_id — and the engine **rejects `limit > 100`**, so it
paginates); `set` is already a local `"HH:MM"` string, not an ISO timestamp; and
`illumination` is already a percent (1.9 = 1.9%), so "normalising" it turned a
0.5% new moon into 50%.

**Depends on:** Features 1 & 3 give it content; Feature 4's settings page
gives it a home for preferences
**Effort:** 2 sessions (a: engine + email digest + centre ✅, b: remaining alert types)

## Objective

Give the sky a voice: a daily "tonight looks like this" digest and timely
event alerts — the reason users return on nights they'd otherwise forget.

## Alert catalog (v1)

| Alert | Trigger | Channel |
|---|---|---|
| Alert | Trigger | Channel | Status |
|---|---|---|---|
| **Daily digest** | User-chosen local time (default 17:00) | Email + in-app | ✅ 7a |
| **Great night** | observing_score ≥ 75 tonight | Email (opt-in) + in-app | ✅ 7b |
| **ISS pass** | **Visible** pass with peak ≥ 40° within next 12 h | in-app + email opt-in | ✅ 7b |
| **Plan urgency** | Planned object good at 22:00 tonight, gone in 14 days | in-app | ✅ 7b |
| **Moon milestones** | New moon window opens / full supermoon | in-app | ✅ 7b |

All five ship. The `Notification.type` enum needed no change — 7a's plumbing
(`sentKey` idempotency, live push, prefs) carried 7b entirely, exactly as planned.

Digest content: sky score + verdict, moon phase/illumination, top 3 targets
with set times, planned-object statuses, next ISS pass. All computed from
existing endpoints — the digest is a composition job, not new science.

## Architecture

- **Scheduler decision:** `node-cron` inside the gateway (v1). Celery exists
  in the astro venv but adds Redis + a worker to deploy; not justified until
  scale demands it. Cron runs every 15 min, selects users whose local digest
  time falls in the window (store `notificationPrefs.digestHourLocal` +
  timezone already on the user).
- Gateway is the orchestrator: it calls the astro engine
  (`astroEngineClient.js` already exists) for visibility/moon/weather/passes
  per user location, renders the email (nodemailer — already configured for
  verification emails; add an HTML digest template), and writes an in-app
  notification doc.
- New `notifications` collection:
  `{ user, type, title, body, data, readAt, createdAt }` + endpoints
  `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`,
  `PATCH /api/v1/notifications/read-all`.
- **Preferences** on the user:
  `notificationPrefs { digest: bool, digestHourLocal, greatNight: bool, issAlerts: bool, email: bool }`
  — settings UI lands on the Profile page (Feature 4).
- **In-app center:** bell icon in the app navbar, unread badge, glass
  dropdown list; live push over the existing socket (`notification:new`).
  Browser push notifications (service worker) explicitly deferred to v2.
- Idempotency: a `sentKey` (e.g. `digest:2026-07-11:userId`) unique index so
  restarts never double-send.

## Testing

Force-run the cron with a fake clock window; digest email renders with real
data; unread badge increments live; read-all clears; prefs opt-outs actually
suppress; duplicate-send blocked by sentKey; a user with no location gets a
"set your location" nudge, not a crash.

---

# Feature 7.5 — Full catalog (13k objects), Explore page & scale fix

**Status:** ✅ **Shipped (Session 30).** The catalog went from **110 Messier to
13,311 objects** (110 Messier + 7,993 NGC + 5,208 IC). Every object has a
description and imagery; the UI shows tonight's top 100 and a new **/explore**
page browses the whole dataset with visualizations. The visibility pipeline was
re-scaled so the growth didn't break /tonight, the digest, or the alerts.

## Data pipeline (astro-engine/scripts)
- **`seed_ngc_catalog.py`** — OpenNGC CSV (CC-BY-SA-4.0) → normalize → bulk
  upsert. Excludes the 107 Messier cross-refs (kept under their M ids), 651
  `Dup`, 10 `NonEx`. Constellations via astropy `get_constellation` (vectorised).
  Idempotent on `catalog_id`; `--dry-run` / `--limit` / `--refresh`.
- **`catalog_content.py`** (shared, pure) — grounded descriptions built ONLY
  from real fields (type, constellation, magnitude, size, Hubble morphology),
  difficulty from magnitude, observation tips; and DSS2 sky-survey image URLs
  via CDS **hips2fits** (a real cutout of each object's own patch of sky, framed
  to its angular size — no storage, no key).
- **`enrich_catalog.py`** — backfills the blank Messier + adds real **Wikipedia**
  prose and **Wikimedia Commons** photos for all Messier + every named NGC/IC
  (211/213 hits). Disk-cached, rate-limited, resumable, idempotent. Result:
  **100% of the catalog has a description and a thumbnail.**

## TRAPS (all cost real debugging)
- **OpenNGC has ~135 physically-impossible magnitudes** (NGC 253 listed V=11.11
  vs B=7.94 → a naked-eye galaxy looked telescope-only). B is OpenNGC's reliable
  column; V is the sparse/patchy one. `select_magnitude` uses V only when B-V is
  physical (−0.4..2.5), else B. SIMBAD is NOT a better arbiter — its integrated
  photometry for extended galaxies is just as broken.
- **Hubble morphology is CASE-SENSITIVE and order-sensitive.** `Sb` = unbarred
  spiral, `SB` = barred. Upper-casing the code mislabels every one of the 3,663
  unbarred spirals "barred" (Andromeda included). `_HUBBLE_PREFIXES` must not be
  sorted or upper-cased.
- **Wikimedia rejects arbitrary thumbnail widths** (large PNGs AND some JPGs 400
  on non-standard widths). Only the summary API's own `thumbnail` (≈330px) and
  `originalimage` URLs are reliable — never manufacture a width. Hero uses
  `originalimage` (a few are heavy, e.g. M31 is an 11 MB PNG; accepted for
  reliability). CC BY-SA text attribution + Commons image credit are stored and
  surfaced on the target panel.

## The scale fix — `/visibility/observable` (was the real danger)
At 13k objects the endpoint returned **7,783 rows, 2.7 MB, 13–33 s** — it would
503 the digest's 4 s timeout and choke the UI. Root causes and fixes:
- **Fat-doc load** (5.8 s): a lean projection (scoring + display fields only)
  in `catalog_service.load_visibility_candidates`. → ~1 s.
- **No candidate filter**: new `max_magnitude` param filters the pool at the DB
  level (needs the new `idx_magnitude` index); also makes "top 100" *bright,
  relevant* objects, not anonymous zenith galaxies. Callers: /tonight passes
  `max_magnitude=13, limit=100`; digest/alerts pass `max_magnitude=13`, no limit
  (they look objects up by id).
- **Per-object time formatting** (`local_hhmm` ×3×N ERFA conversions): vectorised
  into `local_hhmm_batch` (one conversion per array). Warm now **~2.4 s at
  mag≤13**, and the gateway backend calls use `HEAVY_TIMEOUT_MS`.
- Visibility now returns each object's **display fields** (magnitude, size,
  difficulty, description, thumbnail), so /tonight needs no client-side catalog
  merge — the old `fetchCatalog({limit:100})` merge was already broken at 13k.
- **`digestService.catalogNames()` REMOVED**: it paginated the whole 13k catalog
  (130+ requests) just for names. Names now come from the visibility payload
  (`namesFromObjects`) — every object a digest/alert mentions is already in it.

## Explore page (`/explore`, shadcn/ui + recharts)
- Engine `GET /catalog/stats` — one `$facet` aggregation (counts by
  catalog/type/constellation/magnitude), 0.3 s. Declared BEFORE `/{catalog_id}`
  so "stats" isn't captured as an id.
- Frontend: `pages/Explore.jsx` + `components/explore/{StatTiles,CatalogCharts,
  CatalogBrowser}`, `services/catalog.service.js`, `hooks/useCatalog.js`. Charts
  are single-series (one electric-blue hue — the design system sidesteps the
  categorical-palette problem), `isAnimationActive={false}` (recharts' rAF enter
  animation freezes in a hidden verification pane). Table pages/filters
  server-side (267 pages), rows → target panel. Entry points: navbar "Explore",
  the /tonight ledger's "Explore all 13,000+ objects" button.
- `useTargetDetail` now always fetches the full doc by id and overlays live
  geometry — so **any of 13k objects** opens on a cold URL, `/tonight/:id`
  handles space-containing ids (`NGC%20253`).

## Verified live (Session 30)
Seed → 13,311 objects, Messier untouched at 110, 0 id collisions. Magnitude fix
(NGC 253 → 7.94 "Easy"). Morphology 30/30 real codes. Engine timings under
budget. In-pane: Explore renders (4 tiles, 3 charts/30 bars correct colours/no
overflow, 50-row table, pagination 1→2 of 267, filters+search); /tonight shows
100 rows; target panel resolves M42 & NGC 253 by id with real Wikipedia
description + Commons photo + CC BY-SA credit; no console errors; **7b alerts
still 47/47 green**.

**Still open:** a few Wikipedia heroes are heavy (M31 11 MB PNG); a CDN/resize
proxy would fix it. The scoring model is still altitude-dominated (magnitude
weight 0.20) — "top 100" leans on the `max_magnitude` filter for relevance
rather than the score itself.

---

# Feature 7.6 — Performance & UX polish (Session 31) ✅

**Status:** ✅ **Shipped.** Eight fixes after the 13k-catalog landing: the
recommendation/brief slowness the scale exposed, a durable cache so the sky is
never a blank panel, and six UI corrections.

## The big one — recommendations & brief were 20–40 s
The 13k scale-fix updated `/visibility/observable` but **`compute_recommendations`
was never given the same treatment**, so it still (a) called `compute_observable`
UNBOUNDED (every up-object — ~875 at mag≤12, tens of seconds) and (b) reloaded
**all 13k full documents** (`get_all_objects(limit=100_000)`). Two fixes:
- Pass a telescope-derived `max_magnitude` (`candidate_magnitude_cap`: aperture's
  limiting mag + 1, else 12) to both the visibility call and a **lean**
  `load_visibility_candidates` load — the same bounded, projected set /tonight uses.
- **The real killer was a per-object astropy transform.** The "best window peak
  altitude" ran `equatorial_to_horizontal_batch` once *per up-object* (~875 × a
  slow AltAz conversion = ~9 s). It's display-only and doesn't affect ranking, so
  it's now **deferred until after ranking+slicing** and computed for the ≤N
  returned objects alone. → **20–40 s down to ~4–7 s cold.**

## Durable cache — "5-min-old sky beats a blank page" (Feature 7's #2)
- `models/ComputeCache` (Mongo, TTL index) + `services/computeCache.remember()` —
  **stale-while-revalidate**: fresh → serve; stale → serve immediately + refresh
  in the background (deduped by key); missing → compute (the only wait). Survives
  restarts, shared across processes, spares the third-party call (Groq/atlas) per
  request. Keyed by `userId + rounded-loc + scope-sig + history-size`.
- Recommendations: fresh 10 min / stale 30 min. Brief: fresh 3 h / stale 12 h.
  → **repeat load 6.6 s → 0.65 s; brief 9.4 s → 0.46 s** (measured).
- **Brief fallback (the "local lightweight model" ask):** Groq is fast; the
  slowness was the recommendation call it made. Still, `composeBriefFallback`
  writes a grounded brief from the same facts with NO LLM — so a Groq
  hiccup degrades to real prose, never a blank card. Same grounding contract.
- Client poll **5 min → 10 min** (`useRecommendations`).

## Six UI fixes
1. **Duplicate hovering chatbot on /explore** — `/explore` uses `AppLayout` (which
   mounts its own `ChatWidget`) but was missing from `App.jsx`'s `APP_PATHS`, so
   the floating overlay chat mounted a SECOND one. Added it to `APP_PATHS`.
2. **Navbar order** → Home · Dashboard · Tonight · Explore · Community · Guide
   (data-driven list now).
3. **Tonight heading** clamp `4.5→16vw→13rem` (208px) → `3→9vw→7rem` (112px).
4. **Image expand** — `components/target/ImageLightbox` (portal, Esc/backdrop
   close, scroll-lock) + an Expand button on `TargetHero`; the framed hero band
   opens to the full DSS/Wikipedia image.
5. **Target panel is now two panels** — main column (story + data sheet) + a
   sticky rail: **Related objects** (`useSimilarObjects` — same constellation then
   same type, brightest-first, hop-links to each object's panel) and the
   "Coming to this panel" card (AI analysis · why-observe-tonight · history).
6. **All-Sky Chart on /explore** (`components/explore/ExploreSkyChart`) — the live
   dome (zenith centre, horizon rim) plotting objects as their **type glyph**
   (◍❋◉∴✦◇) sized by brightness, with a type filter. Fixes "only blue dots": the
   /tonight dome colours by score (all blue); glyphs vary by type while keeping
   the single-hue rule (types are *shape*, not colour). New catalog API
   `sort=magnitude` (brightest-first, nulls excluded) powers both this and the
   similar-objects rail.

## Verified live (Session 31)
Engine recs 20–40 s → 4–7 s cold; through the gateway 6.6 s → 0.65 s cached, brief
9.4 s → 0.46 s cached (source `llm`, grounded). Fallback brief renders from facts.
In-pane: navbar order correct; /explore has ONE chatbot + the all-sky chart (100
glyphs, 6 types, sizes 7–15px, type filter 100→41 galaxies); target panel
two-panel (682+401px) with Sculptor neighbours brightest-first, lightbox
opens/scroll-locks/closes, real Wikipedia hero; Tonight heading 112px; no console
errors.

## Still open
- The recommendation cold path is still ~4–7 s (real astronomy); the cache hides
  it after first compute. A precompute-on-login warmer would remove even that.
- Similar-objects sort loads a magnitude-sorted page per constellation/type; huge
  constellations (Virgo) get the globally-brightest via the new DB sort, fine.

---

# Feature 8 — AI Recommendation Engine

**Status:** 🔄 **Phases A + B shipped (Session 28)** — personalized re-ranking
(`POST /api/v1/recommendations`, engine), the LLM "Tonight's Brief" (gateway
`groqService.generateBrief`), plus sky-quality/dark-sites and the chat action
protocol. Response carries `model: "heuristic-v1"`, so **Phase C slots in behind
the same endpoint**. Phase C (ML ranker) deliberately deferred: no observation
history exists to train on yet.
**Depends on:** Feature 1 (history = training/personalization signal),
Feature 4 (gear context). Ship AFTER them — without history it has nothing
to learn from.
**Effort:** 2–3 sessions (a: personalized ranking v1, b: natural-language
"tonight brief", c: ML ranker)

## Objective

Move from "objectively best tonight" (current score) to "**best for YOU
tonight**": factoring the user's telescope, history, taste, and stated
intent — plus a natural-language nightly brief that explains *why*.

## Phased plan (each phase ships value alone)

**Phase A — Personalized re-ranking (deterministic, astro engine).**
New endpoint `POST /api/v1/recommendations` (astro engine): takes observer +
optional `telescope { aperture_mm, focal_length_mm, bortle_scale }` +
optional `history { observed: [ids], skipped: [ids] }` (gateway forwards it —
the engine stays stateless and DB-agnostic about users). Score layers on top
of `visibility_score`:
- **Aperture feasibility:** limiting-magnitude estimate
  (`5 log10(aperture_mm) + 2.7`-class formula) — penalize targets fainter
  than the scope can show; boost large-aperture-rewarding targets.
- **Field-of-view fit:** object angular size vs. focal-length-implied FOV —
  don't recommend a 110′ M31 to a 3000 mm SCT as a "see the whole thing" pick.
- **Novelty:** already-observed → gentle penalty (resurface after 60 days);
  skipped twice → stronger penalty.
- **Variety:** diversify the top 10 across types (greedy round-robin) so it's
  never five globulars in a row.
Response includes per-object `reasons: ["High in the south", "Fits your
6-inch well", "You haven't seen this yet"]` — transparency is the product.

**Phase B — "Tonight's Brief" (LLM, gateway).**
The gateway's existing `groqService.js` (AI chat) gains a structured task:
given the recommendation payload + moon + weather + planner, generate a
5-sentence nightly brief ("Start with M13 while it's highest…"). Rendered on
the dashboard as a dismissible card and reused as the digest's opening
paragraph (Feature 7). Strictly grounded: the prompt includes only real
computed facts; temperature low; never invent objects.

**Phase C — Learned ranker (astro engine, scikit-learn).**
Once history accumulates: train a small gradient-boosted ranker on
(user-features, object-features, context) → observed-vs-skipped, exported to
ONNX/joblib, loaded by the engine behind the same `/recommendations`
endpoint (flag `"model": "ml-v1"` in the response). Fallback to Phase A
weights whenever the model or features are missing. Keep the training script
in `astro-engine/scripts/train_ranker.py`, data pulled via a gateway export
endpoint. This is the last mile — do not start here.

## Testing

Phase A: same sky, two telescopes → measurably different rankings with
sensible reasons; novelty penalty visible after marking observed. Phase B:
brief mentions only objects present in the payload (grounding check).
Phase C: offline eval (held-out AUC) before wiring; API contract unchanged.

---

# Feature 9 — Polish backlog (bundle into adjacent sessions)

- **Night-vision mode:** deep-red UI toggle (CSS filter/theme swap on the
  app shell), persisted per user — cheap, thematically perfect, do alongside
  Feature 3.
- **Landing-page live teaser:** ✅ Shipped (Session 24) — `LiveSkyTeaser`
  computes a real sky (public visibility + moon) for a labeled showcase site
  (Kitt Peak) so anonymous visitors see live data; degrades to an inviting
  static panel when the engine/DB is unreachable. Also this session: hero
  ambient-glow layer, feature-card hover (lift + border glow), and the orange
  cursor-spotlight made opt-out (`SpotlightCard spotlight={false}`, off on the
  landing page). Future upgrade: use the visitor's own location (browser
  geolocation on an explicit "Compute my sky" tap) instead of the showcase.
- **Dashboard alignment prefill:** Alignment Mode target dropdown pre-filled
  from the plan (Feature 1 follow-through).
- **Shared API client:** axios instance with interceptors (401 → session
  refresh flow) — tech debt noted in the old roadmap, still real.
- **Global toast system:** one `<Toaster>` (used by planner actions, profile
  saves, notifications) instead of per-component success states.

---

# Feature 10 — Deployment (the finale)

**Status:** ⏳ Not started · **Do last**, after the feature set stabilizes.

Frontend → Vercel; gateway → Railway/Render (Docker); astro engine → Docker
(uvicorn workers, TLE cache volume); MongoDB Atlas already cloud; env via
platform secrets (`network.js` production mode already scaffolded); GitHub
Actions: lint + build + deploy on main. Add `/health` checks to the gateway
(engine has one), uptime monitoring, and Sentry (frontend + gateway) before
inviting real users. Cloudflare tunnel scripts already exist for demos.

---

# Suggested session order

| Session | Ship |
|---|---|
| 19 | Feature 1 — Planner UI (+ alignment prefill) |
| 20 | Feature 3 + night-vision + toasts (science surfacing & polish) |
| 21 | Feature 2 — Auth UX (reset password, verify flow) |
| 22 | Feature 4 — Profiles (avatar, bio, privacy) |
| 23 | Feature 5 — First Light Guide |
| 24–25 | Feature 6 — Community (discovery, then chat) |
| 26 | Feature 7a — Digest + notification center ✅ |
| 27 | Feature 8a — Personalized recommendations ✅ (shipped w/ 8b in 28) |
| 28 | Feature 8b — Tonight's Brief ✅ |
| 29 | Feature 7b — Alerts ✅ (great night · ISS · plan urgency · moon) |
| 30+ | Feature 9 — Polish backlog · Feature 8c — ML ranker · Feature 10 — Deployment |

**Next up:** Feature 9's polish backlog is the only cheap work left (night-vision
mode, alignment prefill, shared API client + interceptors, global toast). 8c stays
blocked until real observation history accumulates, and 10 is the finale.

*Rationale: complete the solo loop first (19–21), then identity (22–23),
then community (24–25), then the systems that need all of the above as fuel
(26–28). Deployment caps it.*
