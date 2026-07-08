import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiActivity } from "react-icons/fi";
import TargetGlyph from "./TargetGlyph";

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
        className="pointer-events-auto absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#AAB4C5] backdrop-blur-3xl transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
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
        className={`pointer-events-auto absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl border backdrop-blur-3xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${
          reduceMotion
            ? "border-orange-400/40 bg-orange-500/15 text-orange-300"
            : "border-white/10 bg-white/5 text-[#AAB4C5] hover:bg-white/10 hover:text-white"
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
            className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-3xl transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            <span className="text-orange-400">
              <TargetGlyph objectType={target.object_type} className="h-4.5 w-4.5" />
            </span>
            <span className="truncate text-sm font-semibold text-white">
              {target.name}
            </span>
            {target.catalog_id && (
              <span className="shrink-0 font-mono text-[11px] text-[#6B7280]">
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
                  className="h-2 w-2 shrink-0 rounded-full bg-[#22C55E]"
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
                className="max-w-md rounded-lg border border-orange-400/20 bg-orange-500/10 px-3 py-1.5 text-center text-xs text-orange-300"
              >
                {banner}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Bottom-center: the one copy line */}
      <div
        className="absolute inset-x-0 flex justify-center px-6"
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
                locked ? "text-[#22C55E]" : "text-white/90"
              }`}
            >
              {copyLine}
            </motion.p>
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
            className="absolute bottom-3 right-4 font-mono text-[10px] text-[#6B7280]"
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
