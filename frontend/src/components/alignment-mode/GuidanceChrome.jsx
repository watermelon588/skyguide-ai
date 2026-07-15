import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiActivity } from "react-icons/fi";
import TargetGlyph from "./TargetGlyph";
import MarkObservedChip from "../plan/MarkObservedChip";

/**
 * The thin DOM layer over the guidance canvas: exit, target pill, the ONE
 * copy line, optional telemetry corner, and the visually-hidden aria-live
 * regions. Everything here is chrome — the scene itself lives on canvas.
 *
 * Copy strings arrive pre-computed (from copy.js via AlignmentMode) so the
 * spoken announcements and the visible line can never diverge.
 */
function GuidanceChrome({
  target, // alignment:target payload's target {catalog_id, name, object_type}
  locked,
  copyLine,
  announcement, // polite aria-live text (state transitions)
  lockAnnouncement, // assertive aria-live text (lock only)
  banner, // unreferenced-compass banner text or null
  telemetry, // { angular, confidence, ephemerisAge } | null when hidden
  onExit,
  onSwitchTarget,
  onToggleTelemetry,
  reduceMotion,
  onToggleReduceMotion,
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Top-left: exit */}
      <button
        type="button"
        onClick={onExit}
        aria-label="Exit Alignment Mode"
        className="pointer-events-auto absolute left-4 top-4 flex h-11 w-11 items-center justify-center border border-line bg-surface-2 text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <FiX className="text-xl" />
      </button>

      {/* Top-right: reduce-motion toggle */}
      <button
        type="button"
        onClick={onToggleReduceMotion}
        aria-label="Reduce motion"
        aria-pressed={reduceMotion}
        title="Reduce motion"
        className={`pointer-events-auto absolute right-4 top-4 flex h-11 w-11 items-center justify-center border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
          reduceMotion
            ? "border-accent/40 bg-accent/15 text-accent-hi"
            : "border-line bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink"
        }`}
      >
        <FiActivity className="text-lg" />
      </button>

      {/* Top-center: target pill */}
      {target && (
        <div className="absolute inset-x-0 top-4 flex flex-col items-center gap-2 px-16">
          <button
            type="button"
            onClick={onSwitchTarget}
            onDoubleClick={onToggleTelemetry}
            title="Tap to switch target · double-tap for telemetry"
            className="pointer-events-auto flex max-w-full items-center gap-2.5 border border-line bg-surface-2 px-4 py-2 transition-colors hover:bg-surface-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <span className="text-accent">
              <TargetGlyph objectType={target.object_type} className="h-4.5 w-4.5" />
            </span>
            <span className="truncate text-sm font-semibold text-ink">
              {target.name}
            </span>
            {target.catalog_id && (
              <span className="shrink-0 font-mono text-[11px] text-ink-3">
                {target.catalog_id}
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
          </button>

          <AnimatePresence>
            {banner && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="max-w-md border border-accent/30 bg-accent/10 px-3 py-1.5 text-center text-xs text-accent-hi"
              >
                {banner}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Bottom-center: the one copy line (+ the log chip once locked) */}
      <div
        className="absolute inset-x-0 flex flex-col items-center gap-3 px-6"
        style={{ bottom: "max(2.5rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <AnimatePresence mode="wait">
          {copyLine && (
            <motion.p
              key={copyLine}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className={`text-center text-xl font-medium ${
                locked ? "text-success" : "text-ink/90"
              }`}
            >
              {copyLine}
            </motion.p>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {locked && target?.catalog_id && (
            <MarkObservedChip catalogId={target.catalog_id} />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom-right: opt-in telemetry (the only numbers in the room) */}
      <AnimatePresence>
        {telemetry && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 right-4 font-mono text-[10px] text-ink-3"
          >
            {telemetry.angular != null ? `${telemetry.angular.toFixed(2)}°` : "—"}
            {" · "}
            {telemetry.confidence != null ? telemetry.confidence : "—"}
            {" · "}
            {telemetry.ephemerisAge != null ? `${telemetry.ephemerisAge}s` : "—"}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Spoken guidance — same strings as the visuals, never per-packet. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <p aria-live="assertive" role="status" className="sr-only">
        {lockAnnouncement}
      </p>
    </div>
  );
}

export default memo(GuidanceChrome);
