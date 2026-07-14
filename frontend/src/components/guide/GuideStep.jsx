import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

import SpotlightCard from "../tonight/fx/SpotlightCard";

/**
 * One guide step — a numbered glass card with its icon, copy, and a deep-link
 * CTA. `done` (only meaningful for trackable steps of signed-in users) swaps
 * the number tile for a green tick. Rises in with the page-level useReveal.
 */
export default function GuideStep({ step, index, done }) {
  return (
    <section
      id={`step-${step.id}`}
      data-reveal
      className="scroll-mt-28"
    >
      <SpotlightCard className="p-7 sm:p-9">
        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Number / done marker */}
          <div className="flex shrink-0 flex-col items-center gap-3">
            <span
              className={`flex h-12 w-12 items-center justify-center border text-lg font-bold ${
                done
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-accent/30 bg-accent/10 text-accent"
              }`}
            >
              {done ? <Check size={20} /> : index + 1}
            </span>
            <span className="text-accent">{step.icon}</span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.3em] text-ink-3">
              {step.eyebrow}
              {done && (
                <span className="bg-success/10 px-2 py-0.5 text-[10px] text-success">
                  Done
                </span>
              )}
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-ink sm:text-3xl">
              {step.title}
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">
              {step.body}
            </p>

            <Link to={step.cta.to}>
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="mt-5 inline-flex items-center gap-2 border border-line bg-surface-2 px-5 py-2.5 text-sm font-semibold text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                {step.cta.label}
                <ArrowRight size={15} />
              </motion.span>
            </Link>
          </div>
        </div>
      </SpotlightCard>
    </section>
  );
}
