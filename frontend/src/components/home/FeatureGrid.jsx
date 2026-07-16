import AngularText from "../fx/AngularText";

/**
 * The platform, tile by tile — a compact bento grid of flat (radius-0, no-glass)
 * tiles that stagger-rise on scroll (via the page-level useReveal). Icons are
 * inline SVG line-work so everything stays one visual weight.
 */

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };

const FEATURES = [
  {
    title: "Recommended for you",
    body: "Tonight's sky, ranked for YOU — your telescope's aperture and field of view, your light pollution, and what you've already seen. Each pick comes with a plain-English reason and its best observing window.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...STROKE}>
        <path d="M12 3l2.5 5.6L20.5 9.4l-4.5 4.1L17 20l-5-3-5 3 1-6.5L3.5 9.4l6-0.8z" />
      </svg>
    ),
  },
  {
    title: "13,000 objects, made legible",
    body: "The whole NGC, IC and Messier deep-sky catalog — galaxies, clusters and nebulae — each with a real image, a description, magnitude and size. Browse it on an all-sky chart or search and filter the full table.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...STROKE}>
        <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15.5a2.5 2.5 0 01-2.5 2.5H6.5A2.5 2.5 0 014 18.5z" />
        <path d="M4 18.5A2.5 2.5 0 016.5 16H20" />
      </svg>
    ),
  },
  {
    title: "Telescope alignment",
    body: "Pair your phone with a QR code, strap it to the tube, and follow on-screen guidance until the target sits dead-center in the eyepiece.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...STROKE}>
        <path d="M4 20l6-6M8 8l9-5 3 5-9 5zM14 13l2 7" />
      </svg>
    ),
  },
  {
    title: "Conditions & sky quality",
    body: "Cloud, humidity, wind, seeing and transparency fused into one observing score — plus a light-pollution reading for your spot and the nearest darker sites worth the drive.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...STROKE}>
        <path d="M4 15a4 4 0 014-4 5 5 0 019.6 1.5A3.5 3.5 0 0117 19H7a3 3 0 01-3-4z" />
      </svg>
    ),
  },
  {
    title: "The sky calls you back",
    body: "A nightly brief and timely alerts — a great clear night, a bright ISS pass overhead, a planned object leaving your evening sky, the dark-moon window opening. Delivered in-app and by email.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...STROKE}>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
      </svg>
    ),
  },
  {
    title: "Astro, your AI copilot",
    body: "Ask anything in plain language — Astro knows your gear, your location and what's overhead right now, and can take you straight to a target, a plan, or the right page.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...STROKE}>
        <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" />
        <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
      </svg>
    ),
  },
  {
    title: "Community & rooms",
    body: "Find observers who share your sky on a privacy-safe map — approximate areas, never exact locations — and talk shop in regional chat rooms.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...STROKE}>
        <path d="M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 10a3 3 0 100-6 3 3 0 000 6zM21 20v-2a4 4 0 00-3-3.9M16 4.1a4 4 0 010 7.8" />
      </svg>
    ),
  },
  {
    title: "Lunar engine",
    body: "Phase, illumination, rise and set, distance and angular size — computed for your exact coordinates, not a generic almanac.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...STROKE}>
        <path d="M20 14.5A8.5 8.5 0 119.5 4a7 7 0 0010.5 10.5z" />
      </svg>
    ),
  },
  {
    title: "Plan, observe, log",
    body: "Queue targets for the night, then mark them observed or skipped. Your history builds a life-list and quietly teaches the recommendations what you like.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...STROKE}>
        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    title: "Guided first light",
    body: "New to a telescope? A step-by-step walkthrough takes you from sign-up to your first object in the eyepiece — and ticks itself off as you go.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...STROKE}>
        <path d="M3 12h4l3-8 4 16 3-8h4" />
      </svg>
    ),
  },
];

export default function FeatureGrid() {
  return (
    <section
      id="features"
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-6 sm:px-12"
    >
      <div data-reveal className="mb-10 max-w-2xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
          The platform
        </p>
        <AngularText
          text="An observatory workflow, end to end"
          className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-ink sm:text-5xl"
        />
        <p className="mt-4 text-ink-2">
          From "what should I look at?" to "it's in the eyepiece" — every step
          is computed, scored and guided.
        </p>
      </div>

      <div
        data-reveal-group
        className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3"
      >
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            data-reveal
            className="group relative bg-surface-2 p-8 transition-colors duration-300 hover:bg-surface-3"
          >
            {/* accent edge on hover */}
            <span className="absolute inset-x-0 top-0 h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100" />
            <span className="inline-flex border border-line p-3 text-accent transition-colors duration-300 group-hover:border-accent">
              {feature.icon}
            </span>
            <h3 className="mt-6 text-lg font-bold text-ink">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              {feature.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
