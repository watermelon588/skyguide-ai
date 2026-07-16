import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import { Sparkles } from "lucide-react";

import { useBrief } from "../../hooks/useRecommendations";

/**
 * Tonight's Brief (Feature 8, Phase B) — the LLM's 5-sentence plan for the
 * night, generated from ONLY computed facts (grounded server-side).
 *
 * Dismissal is per-night (sessionStorage keyed by date): closing it today
 * brings it back tomorrow, because tomorrow is a different sky. Errors render
 * nothing at all — a missing brief is not a problem worth a card.
 */

const dismissKey = () => `brief-dismissed-${new Date().toDateString()}`;

export default function BriefCard() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(dismissKey()) === "1",
  );
  const { brief, isLoading, isError } = useBrief({ enabled: !dismissed });

  const dismiss = () => {
    sessionStorage.setItem(dismissKey(), "1");
    setDismissed(true);
  };

  if (dismissed || isError) return null;

  return (
    <AnimatePresence initial={false}>
      {(isLoading || brief) && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-4 border border-accent/30 bg-accent/5 px-5 py-4"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-accent/30 bg-accent/10 text-accent">
            <Sparkles size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-accent">
              Tonight&apos;s brief
            </p>
            {isLoading ? (
              <div className="mt-2 flex flex-col gap-1.5">
                <div className="h-3 w-full animate-pulse bg-surface-3" />
                <div className="h-3 w-4/5 animate-pulse bg-surface-3" />
              </div>
            ) : (
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{brief}</p>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss tonight's brief"
            className="shrink-0 p-1 text-ink-3 transition-colors hover:text-ink"
          >
            <FiX className="text-base" />
          </button>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
