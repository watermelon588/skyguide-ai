/**
 * First Light Guide — the nine steps from "just signed up" to "the target is
 * in my eyepiece". Static content only; runtime completion state lives in
 * useGuideProgress (keyed by `id`), and the icons are inline SVG line-work so
 * the guide stays asset-free and on the design system's one visual weight.
 *
 * `cta.to` is a real route. `track` marks steps whose completion we can detect
 * from existing app state — untracked steps ("read your dashboard") are purely
 * instructional and never show a tick.
 */

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const GUIDE_STEPS = [
  {
    id: "account",
    track: true,
    eyebrow: "Step 1",
    title: "Create your account",
    body: "Sign up with your email — we'll send a one-click verification link. That link is the only gate; once it's confirmed, the whole platform opens up. Your session is a secure HTTP-only cookie, so you stay signed in without ever handling a token.",
    cta: { label: "Sign up", to: "/login" },
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...S}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20a8 8 0 0116 0" />
      </svg>
    ),
  },
  {
    id: "location",
    track: true,
    eyebrow: "Step 2",
    title: "Set your observing location",
    body: "Everything SkyGuide computes — what's up, how high, when it sets, how bright the Moon is — is calculated for your exact spot on Earth. Share it with one tap of GPS, or type your coordinates. It's stored privately; only a coarse city label ever appears on your public profile.",
    cta: { label: "Set location", to: "/dashboard" },
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...S}>
        <path d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    id: "telescope",
    track: true,
    eyebrow: "Step 3",
    title: "Add your telescope",
    body: "Aperture and focal length are printed on the tube or in the manual — aperture is the big diameter (mm), focal length is how far the light travels to focus. They shape which targets are worth your time and how much sky fits in the eyepiece. Observing with binoculars or naked eye? Skip it for now.",
    cta: { label: "Add telescope", to: "/dashboard" },
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...S}>
        <path d="M4 20l6-6M8 8l9-5 3 5-9 5zM14 13l2 7" />
      </svg>
    ),
  },
  {
    id: "dashboard",
    eyebrow: "Step 4",
    title: "Read your dashboard",
    body: "Your workspace answers one question at a glance: is tonight worth setting up for? The sky-quality score and the Moon tell you the conditions; the ranked targets tell you what to point at; the all-sky chart shows where everything sits above you. Nothing here needs a click to be useful.",
    cta: { label: "Open dashboard", to: "/dashboard" },
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...S}>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    id: "tonight",
    eyebrow: "Step 5",
    title: "Explore Tonight",
    body: "The Tonight report ranks every object above your horizon with a 0–100 visibility score — a blend of altitude, brightness, apparent size, and how much the Moon washes it out. A score of 80 is a comfortable, high, unobstructed target; the Moon being up quietly lowers the fainter ones. Open any object for its full dossier.",
    cta: { label: "See tonight's sky", to: "/tonight" },
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...S}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    id: "plan",
    track: true,
    eyebrow: "Step 6",
    title: "Plan your session",
    body: "Tap the + on any target to add it to tonight's plan. Your planner shows each one's live status — up now, sets at 23:41, or still below the horizon — so you can order your night by what's setting soonest. Everything you add is one tap from being logged once you've seen it.",
    cta: { label: "Build a plan", to: "/tonight" },
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...S}>
        <path d="M4 6h16M4 12h16M4 18h10" />
        <path d="M18 16.5l1.5 1.5 2.5-3" />
      </svg>
    ),
  },
  {
    id: "pair",
    eyebrow: "Step 7",
    title: "Pair your phone",
    body: "Your phone becomes the guidance sensor. Scan the dashboard's QR code to pair the two over a private room, then strap the phone to your telescope tube. Its compass and motion sensors stream orientation back to the app in real time — no extra hardware, no GoTo mount required.",
    cta: { label: "Pair a phone", to: "/dashboard" },
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...S}>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M11 18h2" />
      </svg>
    ),
  },
  {
    id: "align",
    track: true,
    eyebrow: "Step 8",
    title: "Align and observe",
    body: "Pick a target and follow the on-screen guidance — swing the tube the way it points until the error falls to zero and the reticle locks green. That lock means the object is centered in your field. No coordinates to dial, no star-hopping: the sky is the interface, and the phone does the math.",
    cta: { label: "Start observing", to: "/tonight" },
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...S}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="2" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    ),
  },
  {
    id: "log",
    track: true,
    eyebrow: "Step 9",
    title: "Log it",
    body: "The moment a target locks, one tap marks it observed — no typing at the tripod. Add notes over morning coffee if you like. Your observations accumulate into a life list (23 of 110 Messier objects and counting) that lives on your profile. That growing record is what turns a tool into a habit.",
    cta: { label: "View your profile", to: "/profile" },
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...S}>
        <path d="M5 4h11l3 3v13a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
        <path d="M8.5 12.5l2 2 4-4.5" />
      </svg>
    ),
  },
];
