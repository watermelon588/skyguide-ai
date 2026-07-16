# DAY-12

# 🌌 SkyGuide AI — Day 12 Implementation Report

> **Focus:** Growing up. Day 11 made the product usable at 110 objects; Day 12
> makes it real at **13,311**. The sky learns to *warn* you (event alerts), the
> catalog goes from a curated demo to the whole NGC/IC, and then the two things
> that break when a dataset gets 120× bigger — the recommendation pipeline and
> the "instant sky" promise — get fixed properly.
>
> Date: 2026-07-16
>
> Scope: Feature **7b** (the four remaining event alerts, plus an engine-side
> ISS-visibility fix); the **13k catalog** (OpenNGC seed, grounded descriptions,
> real imagery) and the **/explore** page; the **scale fix** to the visibility
> pipeline; and a **performance + UX polish** pass (recommendation/brief
> slowness, a durable stale-while-revalidate cache, and six UI corrections).
>
> The through-line is **scale**, so the difficulties that came with it get their
> own section at the end.

---

# Overview

Three arcs, worked in sequence:

1. **Feature 7b — event alerts.** 7a (Day 11) shipped the notification engine and
   the daily digest; 7b adds the conditional nudges: great night, ISS pass, plan
   urgency, moon milestones. Almost no new plumbing — 7a's idempotency, live push
   and preferences carried it. The one real surprise was in the *engine*: the ISS
   pass endpoint was reporting **invisible daytime passes**.

2. **The 13k catalog + /explore.** The catalog went from 110 Messier to 13,311
   objects (110 Messier + 7,993 NGC + 5,208 IC), each with a grounded description
   and a real image. A new `/explore` page makes a dataset too big to scroll
   legible with visualizations. The visibility pipeline had to be re-scaled so
   the growth didn't 503 the digest or choke the UI.

3. **Performance + UX polish.** The scale exposed a 20–40 s recommendation call;
   the fix plus a Mongo-backed cache turned it into an instant-after-first-load
   experience. Six UI fixes rounded it out (duplicate chatbot, navbar order, a
   two-panel target page, an all-sky chart on /explore, image lightbox, heading
   size).

---

# Part 1 — Feature 7b: the sky calls you back

## 1.1 Four triggers, almost no new plumbing

7a's design paid off: the `Notification` model (`sentKey` unique index =
idempotency), the live socket push and the preference switches all already
existed. 7b is just *deciding whether there's something to say*:

- **`services/alertService.js`** — the four triggers as **pure** functions
  (they return descriptors and write nothing, so each is testable without a
  send). Engine calls are lazily memoized per user, so someone with one alert on
  pays for one call, and two triggers that want tonight's sky share it.
- **`jobs/alertsJob.js`** — a node-cron sibling of the digest job, offset from
  its quarter-hour boundaries so the two don't hit the engine on the same tick.
  Selects by the observer's **local 18:00** (not a preference: an alert's timing
  is dictated by the sky, and 18:00 is at/after dusk for most observers most of
  the year, which is as close as the *nowcast* weather can honestly get to "the
  night ahead").

| Alert | Trigger | Channel |
|---|---|---|
| Great night | `observing_score ≥ 75` | in-app + email |
| ISS pass | soonest **visible** pass, peak ≥ 40°, next 12 h | in-app + email |
| Plan urgency | planned object good at 22:00 tonight but gone in 14 days | in-app |
| Moon | illumination ≤ 5% (dark window) or full supermoon | in-app |

## 1.2 The engine was reporting invisible ISS passes

`/satellites/passes` was purely geometric, so it happily returned a 69°-altitude
**midday** pass. An alert on that would send someone outside to look at a
satellite that isn't lit. The station shines by reflected sunlight, so a pass is
only a *sighting* when the ISS is sunlit **and** the observer's sky is dark. The
endpoint now annotates each pass with `sunlit` / `observer_dark` / `visible`
(cylindrical Earth-shadow model + Sun altitude ≤ −6° at the observer, judged at
peak, via Astropy's builtin solar ephemeris — no new download), and a
`visible_only` request flag the alert opts into. Validated against physics:
London gives 5 visible passes, all 22:07–23:45 (post-dusk); Sydney gives one at
06:12 (dawn); never at noon or midnight.

## 1.3 The jitter trap

The engine re-solves each pass from the call's window start, so `peak.utc` moves
by milliseconds between calls. Four cron ticks fall inside the alert hour, so a
`sentKey` built from `peak.utc` would be four different keys → four identical
alerts. Keyed on the **local date** instead. A single-call test would have
passed; the integration test caught it only because it compared against a
*separate* engine call.

**Verified:** 88 assertions (55 live + 33 pure-logic across DST both directions
and a lunation boundary). 7b is complete — Feature 7 is done.

---

# Part 2 — The full catalog (110 → 13,311)

## 2.1 The source, and what got excluded

**OpenNGC** (CC-BY-SA-4.0) — the maintained NGC/IC reference — as one 3.8 MB CSV,
not 13,000 SIMBAD queries. Chosen because bulk data is a bulk-data problem, and
it ships the cross-IDs and common names SIMBAD makes you self-join for. (The
Messier seeder's TAP path stays right for 110 objects.) `seed_ngc_catalog.py`
excludes 651 `Dup` (pointers to another object), 10 `NonEx` (catalog errors) and
the 107 Messier cross-refs (kept under their M ids, NGC designations surviving as
aliases). Result: **13,201 new + 110 Messier = 13,311, zero id collisions.**

## 2.2 Descriptions from real data, not invented prose

Only ~200 deep-sky objects have anything written about them anywhere. Rather than
leave 13,000 blank or hallucinate, `catalog_content.py` (pure, shared) *composes*
each description from the object's own measured fields — type, constellation,
magnitude, apparent size, Hubble morphology — and drops any clause whose field is
missing. "NGC 253 is a barred spiral galaxy in Sculptor. It shines at magnitude
7.9 and is 26.8′ across — an easy binocular target." degrades gracefully to "IC
5000 is a galaxy." Every clause traces to a number; nothing is guessed.

## 2.3 Imagery for free

There is no photo library for 13,000 obscure galaxies, and stock art would be a
lie. But every object has coordinates, and CDS **hips2fits** renders a real DSS2
cutout of *that patch of sky*, framed to the object's own angular size — a genuine
image of the actual object, no storage, no key. Notable objects (all Messier +
every named NGC/IC, 211/213) are upgraded to real **Wikipedia** prose and
**Wikimedia Commons** photos by `enrich_catalog.py` (disk-cached, rate-limited,
resumable). **Result: 100% of the catalog has a description and a thumbnail.**

## 2.4 /explore

The UI shows tonight's top 100; `/explore` browses the whole dataset. Engine
`GET /catalog/stats` is one `$facet` aggregation (counts by
catalog/type/constellation/magnitude, 0.3 s), rendered as shadcn/ui + recharts
visualizations, over a server-paged table (267 pages). Charts are single-series
(one electric-blue hue — the design system sidesteps the categorical-palette
problem). A later addition (Part 4) put a live all-sky chart here too.

---

# Part 3 — The scale fix (the real danger)

At 13k objects the "what's up now" endpoint (`/visibility/observable`) returned
**7,783 rows, 2.7 MB, in 13–33 s** — it would 503 the digest's 4 s timeout and
choke the browser. Four root causes:

1. **Fat-doc load (5.8 s).** It loaded every full 13k document. → a lean
   projection (`load_visibility_candidates`, scoring + display fields only), ~1 s.
2. **No candidate filter.** New `max_magnitude` param filters the pool at the DB
   level (new `idx_magnitude` index) — a speed win *and* a relevance one: "top
   100" becomes bright, real objects instead of anonymous zenith galaxies.
3. **Per-object time formatting.** `local_hhmm` ran three ERFA conversions per
   object; vectorised into `local_hhmm_batch` (one conversion per array).
4. **A redundant catalog merge and a 130-request name paginator** in the digest,
   both removed — visibility now returns each object's display fields.

Warm now ~2.4 s at mag≤13. **But this fix was only applied to
`/visibility/observable`** — and that omission became Part 5's headline bug.

---

# Part 4 — Performance & UX polish

## 4.1 Recommendations & brief were 20–40 s — the real fix

The scale fix updated the visibility endpoint but **`compute_recommendations` was
never given the same treatment.** It still (a) called `compute_observable`
UNBOUNDED and (b) reloaded **all 13k full documents**. Passing the same
telescope-derived `max_magnitude` + lean load cut it to ~9 s — but the log showed
the visibility part was only ~2 s. The other **9 seconds were a per-object
astropy transform**: the "best-window peak altitude" ran an AltAz conversion once
*per up-object* (~875). It's display-only and doesn't affect ranking, so it's now
**deferred until after ranking + slicing** and computed for the ≤N returned
objects alone. → **20–40 s down to ~4–7 s cold.**

## 4.2 "A five-minute-old sky beats a blank page"

The user's explicit ask. `models/ComputeCache` (Mongo, TTL index) +
`services/computeCache.remember()` implement **stale-while-revalidate**: fresh →
serve; stale → serve immediately *and* refresh in the background (deduped by
key); missing → compute (the only path that waits). It survives restarts, is
shared across processes, and spares the third-party call per request. Keyed by
`userId + rounded-loc + scope-sig + history-size`. Measured: repeat
recommendations **6.6 s → 0.65 s**, brief **9.4 s → 0.46 s**.

The brief also gained a **deterministic fallback** (`composeBriefFallback`) — the
"lightweight local model" ask, answered honestly: Groq is fast, the slowness was
the recommendation call it made, so rather than ship a local LLM, a Groq hiccup
now degrades to a grounded, template-composed brief (same facts, same grounding
contract) instead of a blank card. Client poll relaxed 5 min → 10 min.

## 4.3 Six UI fixes

1. **Duplicate hovering chatbot on /explore** — `/explore` uses `AppLayout` (its
   own `ChatWidget`) but was missing from `App.jsx`'s `APP_PATHS`, so the overlay
   chat mounted a second one. One-line fix.
2. **Navbar order** → Home · Dashboard · Tonight · Explore · Community · Guide.
3. **Tonight heading** 208px → 112px (clamp reduced).
4. **Image lightbox** — `ImageLightbox` (portal, Esc/backdrop close, scroll-lock)
   + an Expand button on the target hero.
5. **Target panel → two panels** — main column (story + data sheet) and a sticky
   rail: **Related objects** (`useSimilarObjects`: same constellation then same
   type, brightest-first, hop-links) + the "Coming to this panel" card. Powered
   by a new catalog API `sort=magnitude`.
6. **All-Sky Chart on /explore** — the live dome plotting objects as their **type
   glyph** (◍❋◉∴✦◇) sized by brightness, with a type filter. Fixes "only blue
   dots": the /tonight dome colours by score (all blue); glyphs vary by type
   while keeping the single-hue rule (types are *shape*, not colour).

**Verified in-pane:** navbar order; one chatbot + all-sky chart on /explore (100
glyphs, 6 types, filter 100→41 galaxies); two-panel target page with Sculptor
neighbours brightest-first; lightbox opens/locks/closes; heading 112px; no
console errors.

---

# Difficulties faced while scaling (110 → 13,311)

The jump was 120×, and almost every problem was a place where "fine at 110"
quietly meant "broken at 13k." In brief:

1. **The catalog load was O(everything), everywhere.** Three separate code paths
   (`/visibility/observable`, `compute_recommendations`, the digest's name
   lookup) each loaded the *entire* catalog as full documents. At 110 that's
   instant; at 13k it's 5–6 s of Mongo transfer *per call*, and the digest ran it
   per user. The fix was the same everywhere — a **lean projection + a
   DB-level magnitude filter** — but it had to be found and applied in each path
   independently. The recommendation path was missed on the first pass and became
   the Day-12 headline bug (Part 4.1). *Lesson: when one hot query is fixed for
   scale, grep for every sibling that shares the pattern — they won't announce
   themselves.*

2. **A hidden per-object astropy cost.** The visibility fix got the endpoint to
   ~2.4 s, so recommendations "should" have been fast too. It wasn't, and the
   profile pointed not at the DB but at a loop doing one AltAz ephemeris transform
   *per object*. Astropy is fast in bulk and slow one-at-a-time; 875 individual
   transforms = 9 s. *Lesson: vectorise, or don't compute it for objects you're
   about to throw away — we now defer it to the ≤N returned.*

3. **Payload size, not just compute.** "Return everything above the horizon" is a
   fine contract at 110 (≈82 rows). At 13k it's ~6,000 rows and multi-megabyte
   JSON that blows a 4 s client timeout regardless of how fast the server is. The
   answer was a product decision baked into the API — **top-N by relevance**
   (`limit` + `max_magnitude`) — with the full set moved to a paged /explore.

4. **Third-party services became a bottleneck at fan-out.** A digest per user ×
   an engine call × a Groq call × a weather call is fine for one user and brutal
   for many. The Mongo cache (Part 4.2) exists precisely so the third parties are
   hit once per fresh window, not once per request, and so a user never waits on
   a cold compute twice.

5. **The source data was dirtier than the demo set.** 110 hand-curated Messier
   objects hid the fact that a real 13k catalog carries **~135 physically
   impossible magnitudes** (NGC 253 listed at V=11.11 — a naked-eye galaxy that
   would have looked telescope-only) and **case-sensitive morphology codes** where
   upper-casing `Sb`→`SB` mislabels all 3,663 unbarred spirals "barred" (Andromeda
   among them). SIMBAD was no better an arbiter — its integrated photometry for
   extended galaxies is just as broken. The fixes (`select_magnitude` trusting
   OpenNGC's reliable B column when B−V is unphysical; an order- and
   case-sensitive `_HUBBLE_PREFIXES`) each came from staring at a wrong-looking
   famous object. *Lesson: validate against known-truth famous objects, not just
   "the field is non-null."*

6. **Imagery and prose don't scale by hand.** There is no world in which 13,000
   descriptions get written or 13,000 photos get sourced. Both had to be
   *generated from data the objects already carried* — descriptions composed from
   measured fields, images rendered on-demand from coordinates (hips2fits) — with
   a hand-quality layer (Wikipedia) reserved for the ~200 objects that have one.

7. **The UI can't render a big dataset the way it rendered a small one.** "Show
   the sky" meant "plot all of it" at 110. At 13k every surface needed a cap
   (top-100), a separate browse page (server-paged), and visualizations to give
   shape to a number too big to scroll — which is what /explore and its all-sky
   chart are for.

The recurring shape: **nothing was *wrong* at 110 — it was just unbounded**, and
scaling is largely the work of finding every unbounded assumption and giving it a
bound (a magnitude cap, a top-N, a projection, a cache window) without changing
what the product feels like.

---

# Files touched (Day 12)

**Engine (astro-engine):**
`services/{alertService is gateway — see below}`,
`services/satellite_service.py` (+visibility annotation),
`schemas/satellites.py`, `api/v1/satellites.py`,
`scripts/{seed_ngc_catalog.py, catalog_content.py, enrich_catalog.py}` (new),
`services/catalog_service.py` (lean load, `max_magnitude`, `sort`, stats),
`services/visibility_service.py` + `recommendation_service.py` (scale + defer),
`api/v1/catalog.py`.

**Gateway (server-gateway):**
`services/{alertService.js (new), computeCache.js (new), groqService.js
(fallback), astroEngineClient.js}`,
`jobs/alertsJob.js` (new), `utils/localTime.js` (new),
`models/{ComputeCache.js (new), Notification, Users}`,
`controllers/{recommendationController.js, notificationController.js}`,
`app.js`.

**Frontend (frontend/src):**
`components/target/{ImageLightbox.jsx (new), SimilarObjects.jsx (new),
TargetHero.jsx}`, `hooks/{useSimilarObjects.js (new), useRecommendations.js}`,
`pages/{TargetPanel.jsx, Explore.jsx}`,
`components/explore/ExploreSkyChart.jsx` (new),
`components/{Navbar.jsx, tonight/TonightHero.jsx}`, `App.jsx`,
`components/notifications/NotificationPrefs.jsx`,
`services/notification.service.js`.

---

*Day 12 in one line: the product stopped being a demo of 110 objects and became a
tool for 13,311 — which mostly meant finding every place that assumed "small" and
teaching it a bound.*
