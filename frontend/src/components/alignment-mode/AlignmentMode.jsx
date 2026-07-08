import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { FiX } from "react-icons/fi";
import AlignmentCanvas from "./AlignmentCanvas";
import GuidanceChrome from "./GuidanceChrome";
import EdgeStateLayer from "./EdgeStateLayer";
import TargetSelect from "./TargetSelect";
import { glyphKind } from "./scene/draw";
import {
  guidanceCopy,
  stateAnnouncement,
  UNREFERENCED_BANNER,
} from "./copy";

/**
 * Alignment Mode — the immersive full-screen alignment experience.
 *
 * Rendered via portal to document.body but mounted INSIDE the Dashboard's
 * PairingProvider tree (context flows through portals), so the pairing
 * socket stays alive. It is deliberately NOT a route: navigating away from
 * /dashboard would tear the provider down and unpair the phone.
 *
 * Purely a consumer: all guidance values arrive pre-computed from the
 * backend alignment engine via useAlignmentFeed (passed in as `feed`);
 * this component only derives PRESENTATION state (phase, edge cards, copy)
 * and writes the canvas's modeRef. Zero science.
 *
 * z-[960]: above the AiSidebar drawer (950) and every dashboard modal
 * (40/50), by design below nothing that matters while it is open.
 */

// Edge-card priority — one card at a time, most actionable first.
function deriveEdge({ feed, orientation, keepBelow }) {
  if (orientation?.status?.reason === "permission_denied") {
    return "permission_denied";
  }
  if (feed.state === "lost" || feed.stale) {
    return orientation?.status?.reason === "background"
      ? "stream_background"
      : "stream_lost";
  }
  const belowHorizon =
    feed.state === "below_horizon" ||
    (feed.update ? !feed.update.above_horizon : false);
  if (belowHorizon && !keepBelow) return "below_horizon";
  return null;
}

/**
 * Lock-moment side effects, centralized as the future audio/haptics
 * extension point: native apps add sound + richer haptics here.
 */
function fireLockMoment() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(30);
  }
}

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
  const modeRef = useRef({ guidance: false, dim: 1 });

  const [showSelect, setShowSelect] = useState(false);
  const [keepBelow, setKeepBelow] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
  );

  const targetInfo = feed.target?.target ?? null;
  const targetName = targetInfo?.name ?? "the target";

  // ---- phase ladder ------------------------------------------------------
  const phase = !hasObserver
    ? "gate"
    : !feed.paired
      ? "blocked"
      : showSelect || !feed.target
        ? "select"
        : "guidance";

  const unreferenced =
    orientation?.model?.calibration?.source === "none" ||
    orientation?.model?.calibration?.status === "unreferenced" ||
    (feed.update?.confidence != null && feed.update.confidence <= 30);

  const edge =
    phase === "guidance" ? deriveEdge({ feed, orientation, keepBelow }) : null;

  const belowHorizonActive =
    phase === "guidance" &&
    (feed.state === "below_horizon" ||
      (feed.update ? !feed.update.above_horizon : false));

  const frozen =
    phase === "blocked" ||
    edge === "stream_lost" ||
    edge === "stream_background" ||
    edge === "permission_denied";

  // ---- canvas mode (read by the rAF loop via ref — never re-renders it) ---
  useEffect(() => {
    modeRef.current = {
      guidance: phase === "guidance",
      frozen,
      dim: edge || phase === "gate" || phase === "blocked" ? 0.45 : 1,
      unreferenced: phase === "guidance" && unreferenced,
      belowHorizon: belowHorizonActive,
      reducedMotion: reduceMotion,
      targetKind: glyphKind(targetInfo?.object_type),
    };
  });

  // ---- copy + announcements ----------------------------------------------
  const locked = feed.state === "locked";
  const inHoldZone =
    !locked &&
    feed.state === "nearly_aligned" &&
    feed.update?.angular_error != null &&
    feed.update.angular_error <= 1;

  const copyLine =
    phase === "guidance" && !edge
      ? guidanceCopy({
          state: feed.state,
          update: feed.update,
          targetName,
          // React-side approximation; the canvas holds the geometric truth.
          targetVisible: feed.state != null && feed.state !== "searching",
          inHoldZone,
          unreferenced,
          lowConfidence:
            feed.update?.confidence != null && feed.update.confidence < 45,
          verbose: reduceMotion,
        })
      : "";

  // Announcements are "state from previous renders" (React's render-phase
  // adjustment pattern) — recomputed only on state-machine transitions, so
  // screen readers hear transitions, never the 4Hz packet commits.
  const [announced, setAnnounced] = useState({ state: null, polite: "", assertive: "" });
  if (phase === "guidance" && feed.state && feed.state !== announced.state) {
    setAnnounced({
      state: feed.state,
      polite:
        feed.state === "locked"
          ? announced.polite
          : stateAnnouncement(feed.state, feed.update, targetName, unreferenced),
      assertive:
        feed.state === "locked"
          ? stateAnnouncement("locked", feed.update, targetName)
          : "",
    });
  }

  // Haptic side effect on the lock transition only.
  useEffect(() => {
    if (locked) fireLockMoment();
  }, [locked]);

  // New target: close the switcher, forget the below-horizon dismissal.
  const targetKey = feed.target?.at ?? null;
  const [seenTargetKey, setSeenTargetKey] = useState(targetKey);
  if (targetKey !== seenTargetKey) {
    setSeenTargetKey(targetKey);
    setShowSelect(false);
    setKeepBelow(false);
  }

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
    if (edge === "below_horizon") setKeepBelow(true);
  }, [edge]);

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
            className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#AAB4C5] backdrop-blur-3xl transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            <FiX className="text-xl" />
          </button>
        )}
      </motion.div>
    </MotionConfig>
  );
}
