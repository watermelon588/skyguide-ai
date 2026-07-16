# DAY-13

# 🌌 SkyGuide AI — Day 13 Implementation Report

> **Focus:** The finish. Day 12 made the product real at 13,000 objects; Day 13
> makes it feel *finished* — one shell everywhere, a phone-shaped layout, an
> assistant that knows the whole product, a Guide you walk instead of scroll,
> and the small correctness details a shipping app is judged on (tab titles, a
> 404, scroll position, transient feedback, image loading).
>
> Date: 2026-07-16
>
> Scope: two batches — (1) a unified responsive navbar, Tonight/Guide adopting
> it, a GSAP "journey" rebuild of the Guide, chatbot omniscience + navigation,
> and refreshed landing copy; (2) seven final-polish items — per-route titles,
> a 404 page, scroll-to-top, a global toast system, navbar on Tonight's state
> screens, dead-code removal, and blur-up images.
>
> No new product features. Every change is UI, UX, or correctness.

---

# Part 1 — One shell, everywhere

## 1.1 The problem

`/tonight` and `/guide` were the only pages with bespoke mini-navs (a back-link
and a single action) while Dashboard, Explore, Community and Profile shared the
real `Navbar`. The app read as two products stitched together.

## 1.2 The unified, auth-aware, responsive navbar

`components/Navbar.jsx` was rewritten to be the *one* navbar and to work for
signed-out visitors too (so the public pages can wear it safely):

- Links always shown (`NavLink`, active = accent); the bell + avatar appear only
  when authenticated, otherwise a "Sign in" button.
- Below the `lg` breakpoint the links collapse into a **hamburger sheet** with a
  body-scroll lock; each item closes the sheet on tap (closing via an onClick,
  not a route-change effect — `setState` in an effect is an eslint error under
  the react-hooks rules).
- **The floating Astro is hidden on phones** (it overlaps content): the
  `ChatWidget` launcher is wrapped `hidden lg:block` in both `AppLayout` and
  `App.jsx`, and the sheet carries an **"Ask Astro"** entry that calls
  `openChat()` — which opens the AiSidebar overlay (app pages) or the ChatWindow
  overlay (public pages) that were already mounted.

`/tonight` and `/guide` now render `<Navbar/>` above their starfield, and were
removed from `App.jsx`'s `HIDE_CHAT_ON` so Astro is available there too. Home
keeps its own cinematic `HomeNav` on purpose.

Verified at 375 px (hamburger, chatbot hidden, sheet works, no page overflow on
any main route) and 1280 px (six links, bell + avatar, floating chatbot).

## 1.3 The Guide as a journey

`/guide` used to be a rail + a stack of cards. It's now a **trail you walk**
(`components/guide/GuideJourney.jsx`): a vertical path whose accent fill advances
as you scroll (GSAP ScrollTrigger scrub), milestones rising in and their nodes
lighting up as you reach them — alternating sides on desktop, stacked down the
left on mobile, with Start and First-light caps. A completed step's node turns
green, so the journey still doubles as the signed-in checklist. Reduced-motion
shows everything at rest. The old `GuideRail.jsx` and `GuideStep.jsx` are gone.

## 1.4 Astro knows the whole product now

`groqService.js`'s manual still said "catalog ids are Messier M1..M110" — a lie
since Day 12. Rewritten to describe the 13 k catalog (M / NGC / IC ids),
`/explore`, recommendations, the brief, and alerts, and to point users at
`/explore` when unsure an object exists. Its action allowlist gained `/explore`
and target-panel routes for any catalog id.

The security boundary in `chatController.js` was widened **carefully** — the LLM
is untrusted input. `normalizeCatalogId()` canonicalizes `M42` / `NGC 253` /
`IC 434` (case- and space-insensitive) and rejects everything else; the
target-panel route validates and rebuilds the id so a bad one can't smuggle a
path through. **15/15 unit tests**: `/tonight/../admin` dropped, external URLs
dropped, garbage targets dropped, ids normalized, capped at three.

## 1.5 Landing copy

`FeatureGrid` went 6 → 9 tiles (a clean 3×3) reflecting what actually ships —
personalized recommendations, the 13 k catalog + Explore, alerts, community,
guided first light — and the stale "110+" proof points became "13,000+".

---

# Part 2 — The finishing details

Seven items, each a thing a shipping app is quietly judged on.

## 2.1 Per-route titles + scroll-to-top (`components/RouteMeta.jsx`)

Every browser tab read **"frontend"**. One component rendered inside the router
now sets a readable `document.title` per route (handling the dynamic
`/tonight/:id` → "M42 · SkyGuide AI" and `/observers/:username`) and returns the
user to the top on navigation — of the *window* for public pages and of the
AppLayout inner scroller (`[data-scroll-root]`) for app pages, since those scroll
inside a flex column, not the window. A hash link scrolls to its anchor instead.
Parsing the pathname directly (not `useParams`, which is empty outside a matched
`<Route>`).

## 2.2 A real 404 (`pages/NotFound.jsx` + `path="*"`)

An unknown URL rendered nothing. Now it lands on a designed "Lost in space" page
in the app's language (starfield + shared nav) with the three ways back.

## 2.3 A global toast system (`context/ToastContext.jsx`)

One `ToastProvider` (mounted in `main.jsx`) replaces the scattered inline
"Saved!" banners. Design-system native: flat surface, hairline border, radius 0,
a coloured left edge per kind, portalled so no overflow can clip it,
auto-dismissing. Ergonomic surface: `toast.success/error/info(msg)`. Wired into
the planner (`useObservations`: add / remove / mutation errors, incl. the 409
"already on your plan") and the profile (`useProfile`: save, avatar set/clear,
errors) — the avatar and toggle actions had **no** feedback before. Verified:
adding M42 fired "M42 added to your plan".

## 2.4 Navbar on Tonight's state screens

Tonight's no-location / loading / error states shared a `CenteredShell` that had
no nav — a uniformity gap now that everything else has one. The shell now renders
`<Navbar/>` above its centred content.

## 2.5 Dead code

`GuideRail.jsx` and `GuideStep.jsx` (orphaned by the journey rebuild) deleted
after confirming no other imports.

## 2.6 Blur-up images (`components/common/ProgressiveImage.jsx`)

A few hero images are heavy — the M31 hero is an 11 MB Wikimedia PNG — and a grey
box for a second reads as broken. `ProgressiveImage` shows the small catalog
thumbnail (blurred, scaled) instantly, then crossfades to the full image on load.
Applied to the target-panel hero. Verified: the blurred placeholder renders at
opacity 1 with the full image layered behind, fading in on decode.

---

# Difficulties / notes

- **The frozen verification pane, again.** GSAP ScrollTrigger reveals and Framer
  slide-ins show `opacity:0` / off-screen transforms in the hidden pane (rAF is
  frozen) — confirmed by checking that the *shipped* landing `[data-reveal]`
  elements do the same. Layout (positions, widths, overflow) IS verifiable; the
  animated end-state is not. Don't read opacity-0-in-pane as a bug.
- **The teststack CORS trap cost a real debugging loop.** The frontend calls the
  **astro engine** directly for catalog/visibility data, so the engine — not just
  the gateway — needs the pane's origin in `CORS_ORIGINS`. Vite landed on 5174
  (5173 was taken); the target panel sat on skeletons with "Failed to fetch"
  until the engine was restarted with `CORS_ORIGINS=…5174`. Both servers need the
  live vite origin.
- **react-compiler eslint is stricter than expected.** A `useRef` id counter read
  inside the toast factory tripped "Cannot access refs during render", and
  `fn.x = …` property mutation tripped "value cannot be modified". Fixed with a
  module-scope counter and a single `Object.assign`. (The
  `react-refresh/only-export-components` warning on the context file is the same
  one every existing context file has — provider + hook in one file — and is a
  dev-only fast-refresh hint, left as-is for consistency.)

---

# Files touched (Day 13)

**Frontend (frontend/src):**
`components/Navbar.jsx` (rewrite), `components/RouteMeta.jsx` (new),
`components/common/ProgressiveImage.jsx` (new), `context/ToastContext.jsx` (new),
`components/guide/GuideJourney.jsx` (new), `pages/NotFound.jsx` (new),
`pages/Guide.jsx` (rewrite), `pages/Tonight.jsx`, `pages/TargetPanel`'s
`components/target/TargetHero.jsx`, `App.jsx`, `main.jsx`,
`layouts/AppLayout.jsx`, `components/layout/MainContent.jsx`,
`hooks/useObservations.js`, `hooks/useProfile.js`,
`components/home/{FeatureGrid,HomeHero,HowItWorks}.jsx`; **deleted**
`components/guide/{GuideRail,GuideStep}.jsx`.

**Gateway (server-gateway/src):**
`services/groqService.js` (manual + action spec),
`controllers/chatController.js` (id normalization + route allowlist).

---

*Day 13 in one line: the product stopped looking like a collection of good pages
and started looking like one finished thing.*
