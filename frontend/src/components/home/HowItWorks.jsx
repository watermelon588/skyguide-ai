import CountUp from "../tonight/fx/CountUp";
import AngularText from "../fx/AngularText";

/**
 * Three-step narrative plus a proof band of counting numbers. Steps rise in
 * with the shared reveal choreography; the connecting rail is pure CSS.
 */

const STEPS = [
  {
    title: "Tell us where you are",
    body: "One tap shares your coordinates — or type them in. Everything downstream is computed for that exact spot on Earth.",
  },
  {
    title: "We rank your sky",
    body: "The Astro Engine transforms the whole catalog to your horizon, folds in the Moon and the weather, and hands you tonight's best targets.",
  },
  {
    title: "Your phone guides the tube",
    body: "Pair it with a QR code, mount it on the telescope, and follow the live guidance until the target is centered. No GoTo mount required.",
  },
];

const PROOF = [
  { value: 110, suffix: "+", label: "deep-sky objects scored" },
  { value: 100, suffix: "", label: "point visibility scale" },
  { value: 60, suffix: "s", label: "from sign-in to a ranked sky" },
  { value: 0, suffix: "", label: "extra hardware needed" },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-6 sm:px-12"
    >
      <div data-reveal className="mb-12 max-w-2xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
          How it works
        </p>
        <AngularText
          text="Three steps to first light"
          className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight text-ink sm:text-5xl"
        />
      </div>

      <ol data-reveal-group className="relative space-y-10">
        {/* Connecting rail */}
        <span
          aria-hidden="true"
          className="absolute left-[23px] top-3 hidden h-[calc(100%-24px)] w-px bg-gradient-to-b from-accent via-line to-transparent sm:block"
        />
        {STEPS.map((step, index) => (
          <li key={step.title} data-reveal className="relative flex gap-6">
            <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center border border-accent bg-black text-lg font-black tabular-nums text-accent">
              {index + 1}
            </span>
            <div className="pt-1">
              <h3 className="text-xl font-bold text-ink">{step.title}</h3>
              <p className="mt-2 max-w-xl leading-relaxed text-ink-2">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div
        data-reveal
        className="mt-16 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4"
      >
        {PROOF.map((item) => (
          <div key={item.label} className="bg-surface-2 p-8 text-center">
            <p className="text-4xl font-black tabular-nums text-accent sm:text-5xl">
              <CountUp value={item.value} suffix={item.suffix} />
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.1em] text-ink-2">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
