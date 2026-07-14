import AngularText from "../fx/AngularText";

/**
 * The platform, tile by tile — a compact bento grid of flat (radius-0, no-glass)
 * tiles that stagger-rise on scroll (via the page-level useReveal). Icons are
 * inline SVG line-work so everything stays one visual weight.
 */

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };

const FEATURES = [
  {
    title: "Tonight's sky, ranked",
    body: "Every catalog object above your horizon is scored live — altitude, brightness, apparent size — and ranked into a personal observing list.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...STROKE}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" />
        <circle cx="12" cy="12" r="2.5" />
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
    title: "Atmosphere intelligence",
    body: "Cloud cover, humidity, wind, seeing and transparency are fused into one observing score, so you know before you set up.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...STROKE}>
        <path d="M4 15a4 4 0 014-4 5 5 0 019.6 1.5A3.5 3.5 0 0117 19H7a3 3 0 01-3-4z" />
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
    title: "Deep-sky catalog",
    body: "A curated Messier-and-beyond catalog with magnitudes, sizes, coordinates and observation tips — searchable and filterable.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...STROKE}>
        <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15.5a2.5 2.5 0 01-2.5 2.5H6.5A2.5 2.5 0 014 18.5z" />
        <path d="M4 18.5A2.5 2.5 0 016.5 16H20" />
      </svg>
    ),
  },
  {
    title: "AI copilot",
    body: "Ask anything about the night sky in plain language — the assistant knows your gear, your location and what's overhead right now.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...STROKE}>
        <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" />
        <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
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
