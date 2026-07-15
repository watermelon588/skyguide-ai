import { useCallback, useEffect, useRef, useState } from "react";
import { glyphKind } from "./scene/draw";
import { guidanceCopy, stateAnnouncement } from "./copy";

/**
 * The presentation brain behind every guidance surface.
 *
 * Extracted from AlignmentMode (Session 15) so the fullscreen overlay and the
 * /alignment workspace's guide column derive phase, edge state, canvas mode and
 * copy from ONE implementation. Consumers differ only in what they paint.
 *
 * Still zero science: every number arrives pre-computed from the backend
 * alignment engine via useAlignmentFeed. This only turns engine state into
 * presentation state, and writes the canvas's modeRef.
 *
 * @param {object}  feed          useAlignmentFeed() result (or the lab's mock)
 * @param {object}  orientation   useOrientationFeed() result
 * @param {boolean} hasObserver   observer location is set
 * @param {boolean} showSelect    caller is showing its target picker
 * @param {boolean} reduceMotion  honour prefers-reduced-motion
 */
export function useGuidanceScene({
  feed,
  orientation,
  hasObserver,
  showSelect = false,
  reduceMotion = false,
}) {
  const modeRef = useRef({ guidance: false, dim: 1 });
  const [keepBelow, setKeepBelow] = useState(false);

  const targetInfo = feed.target?.target ?? null;
  const targetName = targetInfo?.name ?? "the target";

  // ---- phase ladder --------------------------------------------------------
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

  // ---- canvas mode (read by the rAF loop via ref — never re-renders it) -----
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

  // ---- copy ----------------------------------------------------------------
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
  const [announced, setAnnounced] = useState({
    state: null,
    polite: "",
    assertive: "",
  });
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

  // A new target forgets the previous one's below-horizon dismissal.
  const targetKey = feed.target?.at ?? null;
  const [seenTargetKey, setSeenTargetKey] = useState(targetKey);
  const targetChanged = targetKey !== seenTargetKey;
  if (targetChanged) {
    setSeenTargetKey(targetKey);
    setKeepBelow(false);
  }

  const keepBelowHorizon = useCallback(() => setKeepBelow(true), []);

  return {
    phase,
    edge,
    modeRef,
    locked,
    unreferenced,
    belowHorizonActive,
    frozen,
    copyLine,
    announced,
    targetInfo,
    targetName,
    /** True on the render where feed.target became a different target. */
    targetChanged,
    /** Dismiss the below-horizon card and keep guiding anyway. */
    keepBelowHorizon,
  };
}

/** Edge-card priority — one card at a time, most actionable first. */
export function deriveEdge({ feed, orientation, keepBelow }) {
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
