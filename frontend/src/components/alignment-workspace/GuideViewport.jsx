import { useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { FiActivity, FiMaximize2, FiMinimize2, FiX } from "react-icons/fi";
import AlignmentCanvas from "../alignment-mode/AlignmentCanvas";
import EdgeStateLayer from "../alignment-mode/EdgeStateLayer";
import TargetGlyph from "../alignment-mode/TargetGlyph";
import MarkObservedChip from "../plan/MarkObservedChip";
import { useGuidanceScene } from "../alignment-mode/useGuidanceScene";
import { UNREFERENCED_BANNER } from "../alignment-mode/copy";

/**
 * The visual guide, sized to a column.
 *
 * Same scene as the Session-15 overlay — same canvas, same useGuidanceScene
 * derivation, same copy — but it lives inside the workspace's right column
 * instead of swallowing the viewport, because a starfield at 100vw told the
 * user nothing the telemetry column wasn't already saying better. Expand
 * restores the full-bleed experience for when you're actually at the eyepiece.
 *
 * Zero science: every value arrives pre-computed from the backend engine.
 */
export default function GuideViewport({ feed, orientation, hasObserver, onClearTarget }) {
  const [expanded, setExpanded] = useState(false);
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
    keepBelowHorizon,
  } = useGuidanceScene({
    feed,
    orientation,
    hasObserver,
    reduceMotion,
  });

  const telemetry =
    showTelemetry && feed.update
      ? {
          angular: feed.update.angular_error,
          confidence: feed.update.confidence,
          ephemerisAge: feed.update.ephemeris_age_s,
        }
      : null;

  // below_horizon offers "pick another" (clear the target, back to the picker);
  // every other edge state is informational here — the workspace's own panels
  // already say what's wrong, and the column has nowhere to navigate to.
  const handleEdgePrimary = () => {
    if (edge === "below_horizon") onClearTarget();
  };

  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
      <motion.div
        layout
        className={
          expanded
            ? "fixed inset-0 z-[960] bg-[#05070A]"
            : "relative min-h-[320px] w-full overflow-hidden border border-line bg-[#05070A] lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)]"
        }
        style={expanded ? { touchAction: "none" } : undefined}
      >
        <AlignmentCanvas packetRef={feed.packetRef} modeRef={modeRef} />

        {/* Target pill — also the switch-target affordance, as in the overlay. */}
        {targetInfo && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-14">
            <div className="pointer-events-auto flex max-w-full items-center gap-2.5 border border-line bg-surface-2 px-3.5 py-2">
              <span className="shrink-0 text-accent">
                <TargetGlyph
                  objectType={targetInfo.object_type}
                  className="h-4 w-4"
                />
              </span>
              <span className="truncate text-sm font-semibold text-ink">
                {targetInfo.name}
              </span>
              {targetInfo.catalog_id && (
                <span className="shrink-0 font-mono text-[11px] text-ink-3">
                  {targetInfo.catalog_id}
                </span>
              )}
              <AnimatePresence>
                {locked && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="h-2 w-2 shrink-0 bg-success"
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Top-left: stop guiding. */}
        <button
          type="button"
          onClick={onClearTarget}
          aria-label="Stop guiding"
          title="Stop guiding"
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center border border-line bg-surface-2 text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <FiX className="text-lg" />
        </button>

        {/* Top-right: expand + reduce motion. */}
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            type="button"
            onClick={() => setReduceMotion((v) => !v)}
            aria-label="Reduce motion"
            aria-pressed={reduceMotion}
            title="Reduce motion"
            className={`flex h-9 w-9 items-center justify-center border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
              reduceMotion
                ? "border-accent/40 bg-accent/15 text-accent-hi"
                : "border-line bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink"
            }`}
          >
            <FiActivity className="text-base" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Exit full screen" : "Full screen"}
            title={expanded ? "Exit full screen" : "Full screen"}
            className="flex h-9 w-9 items-center justify-center border border-line bg-surface-2 text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            {expanded ? (
              <FiMinimize2 className="text-base" />
            ) : (
              <FiMaximize2 className="text-base" />
            )}
          </button>
        </div>

        {/* Unreferenced-compass banner. */}
        <AnimatePresence>
          {phase === "guidance" && unreferenced && !edge && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-x-0 top-16 mx-auto max-w-xs border border-accent/30 bg-accent/10 px-3 py-1.5 text-center text-[11px] text-accent-hi"
            >
              {UNREFERENCED_BANNER}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Bottom: the one copy line (+ the log chip once locked). */}
        <div
          className="absolute inset-x-0 flex flex-col items-center gap-2.5 px-5"
          style={{ bottom: "max(1.75rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <AnimatePresence mode="wait">
            {copyLine && (
              <motion.p
                key={copyLine}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className={`text-center font-medium ${
                  expanded ? "text-xl" : "text-base"
                } ${locked ? "text-success" : "text-ink/90"}`}
              >
                {copyLine}
              </motion.p>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {locked && targetInfo?.catalog_id && (
              <MarkObservedChip catalogId={targetInfo.catalog_id} />
            )}
          </AnimatePresence>
        </div>

        {/* Opt-in telemetry corner — double-click the scene, as in the overlay. */}
        <button
          type="button"
          onDoubleClick={() => setShowTelemetry((v) => !v)}
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-x-0 top-14 bottom-20 cursor-default"
        />
        <AnimatePresence>
          {telemetry && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-2 right-3 font-mono text-[10px] text-ink-3"
            >
              {telemetry.angular != null
                ? `${telemetry.angular.toFixed(2)}°`
                : "—"}
              {" · "}
              {telemetry.confidence != null ? telemetry.confidence : "—"}
              {" · "}
              {telemetry.ephemerisAge != null
                ? `${telemetry.ephemerisAge}s`
                : "—"}
            </motion.p>
          )}
        </AnimatePresence>

        <EdgeStateLayer
          edge={edge}
          targetName={targetInfo?.name}
          onPrimary={handleEdgePrimary}
          onSecondary={keepBelowHorizon}
        />

        {/* Spoken guidance — same strings as the visuals, never per-packet. */}
        <p aria-live="polite" className="sr-only">
          {announced.polite}
        </p>
        <p aria-live="assertive" role="status" className="sr-only">
          {announced.assertive}
        </p>
      </motion.div>
    </MotionConfig>
  );
}
