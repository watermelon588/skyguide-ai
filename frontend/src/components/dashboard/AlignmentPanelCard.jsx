import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiCrosshair } from "react-icons/fi";
import {
  DASHBOARD_CARD_SHELL,
  DASHBOARD_CARD_MOTION,
  CardIdentity,
} from "./DashboardCard";
import ConnectionIndicator from "../alignment/ConnectionIndicator";
import Button from "../ui/Button";
import AlignmentMode from "../alignment-mode/AlignmentMode";
import { useAlignmentFeed } from "../../hooks/useAlignmentFeed";
import { useOrientationFeed } from "../../hooks/useOrientationFeed";
import { useLocation } from "../../hooks/useLocation";

/**
 * Alignment launch card (Session 15) — the dashboard slot that opens the
 * immersive Alignment Mode overlay. Supersedes the Session-14 numeric
 * readout: the engineering values now live in the overlay's opt-in
 * telemetry corner, and this card only reports status and launches.
 *
 * Renders only while a phone is paired (same guard as before). The overlay
 * is mounted HERE — inside the Dashboard's PairingProvider tree — because
 * the pairing socket lives under this page; a route would drop it.
 */

const STATES = {
  searching: { label: "Searching", tone: "waiting" },
  close: { label: "Close", tone: "waiting" },
  nearly_aligned: { label: "Nearly Aligned", tone: "waiting" },
  locked: { label: "Locked", tone: "connected" },
  below_horizon: { label: "Below Horizon", tone: "error" },
  lost: { label: "Signal Lost", tone: "error" },
};

export default function AlignmentPanelCard({ launchTarget = null, onLaunched }) {
  const feed = useAlignmentFeed();
  const orientation = useOrientationFeed();
  const { hasLocation } = useLocation();
  const [open, setOpen] = useState(false);

  // Guided observe flow (/dashboard?observe=<id>): the moment we're paired
  // with a pending launch target, aim the engine and open the overlay — the
  // user never picks the target manually. Ref-guarded so the set_target
  // request fires exactly once per target.
  const launchedRef = useRef(null);
  useEffect(() => {
    if (!launchTarget || !feed.paired) return;
    if (launchedRef.current === launchTarget) return;
    launchedRef.current = launchTarget;
    feed.setTarget(launchTarget);
    setOpen(true);
    onLaunched?.();
  }, [launchTarget, feed, onLaunched]);

  // The card itself is paired-only, but an OPEN overlay must survive a
  // mid-session pairing drop so it can show its "Phone disconnected" card
  // instead of vanishing under the user.
  if (!feed.paired && !open) return null;

  const trackedName = feed.target?.target?.name ?? null;
  const badge = feed.target ? STATES[feed.state] : null;

  const subtitle = trackedName
    ? `Tracking ${trackedName}`
    : "Guided telescope alignment, no numbers required.";

  return (
    <>
      {feed.paired && (
        <motion.section
          {...DASHBOARD_CARD_MOTION}
          className={`${DASHBOARD_CARD_SHELL} flex flex-wrap items-center gap-x-6 gap-y-4`}
        >
          <CardIdentity
            className="flex-1"
            icon={<FiCrosshair className="text-lg text-orange-400" />}
            title="Alignment Mode"
            subtitle={subtitle}
            trailing={
              badge ? (
                <span className="ml-2 shrink-0">
                  <ConnectionIndicator tone={badge.tone} label={badge.label} />
                </span>
              ) : null
            }
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => setOpen(true)}
            className="ml-auto shrink-0"
          >
            <FiCrosshair className="text-base" />
            {trackedName ? "Resume Alignment" : "Enter Alignment Mode"}
          </Button>
        </motion.section>
      )}

      <AlignmentMode
        open={open}
        feed={feed}
        orientation={orientation}
        hasObserver={hasLocation}
        onExit={() => setOpen(false)}
      />
    </>
  );
}
