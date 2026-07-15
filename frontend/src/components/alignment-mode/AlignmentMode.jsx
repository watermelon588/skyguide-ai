import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { FiX } from "react-icons/fi";
import AlignmentCanvas from "./AlignmentCanvas";
import GuidanceChrome from "./GuidanceChrome";
import EdgeStateLayer from "./EdgeStateLayer";
import TargetSelect from "./TargetSelect";
import { useGuidanceScene } from "./useGuidanceScene";
import { UNREFERENCED_BANNER } from "./copy";

/**
 * Alignment Mode — the immersive full-screen alignment experience.
 *
 * Still used by the DEV-only /align-lab simulator. The product surface is now
 * the /alignment workspace (AlignmentWorkspace page), whose guide column
 * paints the same scene inside a two-column layout instead of taking over the
 * viewport; both consume useGuidanceScene, so phase/edge/copy can't diverge.
 *
 * Rendered via portal to document.body, but context flows through portals, so
 * it stays inside whatever PairingProvider mounted it.
 *
 * Purely a consumer: all guidance values arrive pre-computed from the backend
 * alignment engine via useAlignmentFeed (passed in as `feed`). Zero science.
 *
 * z-[960]: above the AiSidebar drawer (950) and every dashboard modal (40/50).
 */

/**
 * Public wrapper: the portal lives OUTSIDE AnimatePresence so exit
 * animations complete (AnimatePresence cannot track a child whose motion
 * root renders through a portal inside it — the exit-complete signal never
 * fires and the overlay sticks). Mount this unconditionally and drive it
 * with `open`.
 */
export default function AlignmentMode({ open, feed, orientation, hasObserver, onExit }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <AlignmentModeShell
          feed={feed}
          orientation={orientation}
          hasObserver={hasObserver}
          onExit={onExit}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}

function AlignmentModeShell({ feed, orientation, hasObserver, onExit }) {
  const containerRef = useRef(null);

  const [showSelect, setShowSelect] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
  );

  const {
    phase,
    edge,
    modeRef,
    locked,
    unreferenced,
    copyLine,
    announced,
    targetInfo,
    targetChanged,
    keepBelowHorizon,
  } = useGuidanceScene({
    feed,
    orientation,
    hasObserver,
    showSelect,
    reduceMotion,
  });

  // A new target also closes the switcher — the overlay's own concern, so it
  // stays here rather than in the shared hook.
  if (targetChanged && showSelect) setShowSelect(false);

  // ---- overlay hygiene ------------------------------------------------------
  // Mount-only: scroll lock, initial focus, focus restore.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    containerRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  // Keyboard: Esc backs out of the switcher, then the overlay; Tab is
  // trapped inside. Re-bound when the escape route changes — cheap.
  const hasTarget = !!feed.target;
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (showSelect && hasTarget) {
          setShowSelect(false);
        } else {
          onExit();
        }
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = container.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [showSelect, hasTarget, onExit]);

  // ---- actions -------------------------------------------------------------
  const handleEdgePrimary = useCallback(() => {
    if (edge === "below_horizon") {
      setShowSelect(true);
    } else {
      onExit(); // no_observer / pairing_lost: back to dashboard
    }
  }, [edge, onExit]);

  const handleEdgeSecondary = useCallback(() => {
    if (edge === "below_horizon") keepBelowHorizon();
  }, [edge, keepBelowHorizon]);

  const handleSelectExit = useCallback(() => {
    if (feed.target) feed.clearTarget();
    onExit();
  }, [feed, onExit]);

  const telemetry =
    showTelemetry && feed.update
      ? {
          angular: feed.update.angular_error,
          confidence: feed.update.confidence,
          ephemerisAge: feed.update.ephemeris_age_s,
        }
      : null;

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
      <motion.div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Alignment Mode"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed inset-0 z-[960] overflow-hidden overscroll-contain bg-[#05070A] outline-none"
        style={{ touchAction: "none" }}
      >
        <AlignmentCanvas packetRef={feed.packetRef} modeRef={modeRef} />

        {phase === "select" && (
          <TargetSelect feed={feed} onExit={handleSelectExit} />
        )}

        {phase === "guidance" && (
          <GuidanceChrome
            target={targetInfo}
            locked={locked}
            copyLine={copyLine}
            announcement={announced.polite}
            lockAnnouncement={announced.assertive}
            banner={unreferenced && !edge ? UNREFERENCED_BANNER : null}
            telemetry={telemetry}
            onExit={onExit}
            onSwitchTarget={() => setShowSelect(true)}
            onToggleTelemetry={() => setShowTelemetry((v) => !v)}
            reduceMotion={reduceMotion}
            onToggleReduceMotion={() => setReduceMotion((v) => !v)}
          />
        )}

        {(phase === "gate" || phase === "blocked" || edge) && (
          <EdgeStateLayer
            edge={phase === "gate" ? "no_observer" : phase === "blocked" ? "pairing_lost" : edge}
            targetName={targetInfo?.name}
            onPrimary={handleEdgePrimary}
            onSecondary={handleEdgeSecondary}
          />
        )}

        {/* Gate/blocked phases still need a way out even without the chrome. */}
        {(phase === "gate" || phase === "blocked") && (
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit Alignment Mode"
            className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center border border-line bg-surface-2 text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <FiX className="text-xl" />
          </button>
        )}
      </motion.div>
    </MotionConfig>
  );
}
