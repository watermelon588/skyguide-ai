import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowLeft, FiCrosshair, FiMapPin, FiSmartphone } from "react-icons/fi";

import SessionPanel from "../components/alignment-workspace/SessionPanel";
import OrientationPanel from "../components/alignment-workspace/OrientationPanel";
import EnginePanel from "../components/alignment-workspace/EnginePanel";
import TargetPicker from "../components/alignment-workspace/TargetPicker";
import GuideViewport from "../components/alignment-workspace/GuideViewport";
import ConnectionIndicator from "../components/alignment/ConnectionIndicator";
import { useAlignmentFeed } from "../hooks/useAlignmentFeed";
import { useOrientationFeed } from "../hooks/useOrientationFeed";
import { useLocation } from "../hooks/useLocation";
import { useTonight } from "../hooks/useTonight";
import { usePairing } from "../context/PairingContext";

/**
 * /alignment — the telescope alignment workspace.
 *
 * Where the Orientation Engine, the Alignment Engine and the live session
 * actually live. Previously all three were dashboard cards plus a full-screen
 * overlay; the dashboard is for planning, and a 100vw starfield is a poor place
 * to read a quaternion, so they moved here.
 *
 * Layout follows the work: ONE column of instrumentation until a target is
 * chosen, then two — telemetry left, the visual guide right. The guide only
 * earns half the screen once there is something to guide toward.
 *
 * This is a real route (not the Session-15 overlay) because PairingProvider now
 * sits above it in PairedRoutes; navigating here no longer drops the phone.
 */
export default function AlignmentWorkspace() {
  const feed = useAlignmentFeed();
  const orientation = useOrientationFeed();
  const { pairing } = usePairing();
  const { hasLocation } = useLocation();
  const tonight = useTonight();
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- guided hand-off (?target=M42) --------------------------------------
  // The whole point of "Start observing": arrive already aiming. Ref-guarded so
  // the set_target request fires exactly once, and cleared from the URL after
  // so a refresh doesn't silently re-aim a target the user has since changed.
  const requestedTarget = searchParams.get("target")?.toUpperCase() || null;
  const launchedRef = useRef(null);

  useEffect(() => {
    if (!requestedTarget || !feed.paired) return;
    if (launchedRef.current === requestedTarget) return;
    launchedRef.current = requestedTarget;
    feed.setTarget(requestedTarget);
    setSearchParams({}, { replace: true });
  }, [requestedTarget, feed, setSearchParams]);

  const hasTarget = !!feed.target;

  if (!hasLocation) {
    return (
      <Gate
        icon={FiMapPin}
        title="Set your observing location first"
        body="The alignment engine computes where objects sit in YOUR sky. Without a location there's nothing to aim at."
        cta="Set location"
      />
    );
  }

  if (!feed.paired) {
    return (
      <Gate
        icon={FiSmartphone}
        title={
          pairing.status === "waiting" || pairing.status === "creating"
            ? "Waiting for your phone"
            : "No phone paired"
        }
        body={
          pairing.status === "waiting" || pairing.status === "creating"
            ? "Scan the QR code on your dashboard. The moment your phone connects, this page takes over."
            : "Your phone is the guidance sensor — its compass and gyroscope are what the alignment engine reads. Pair it from the dashboard to begin."
        }
        cta={pairing.status === "waiting" ? "Back to the QR code" : "Sync telescope"}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div className="min-w-0">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.3em] text-accent transition-colors hover:text-accent-hi"
          >
            <FiArrowLeft className="text-sm" />
            Dashboard
          </Link>
          <h1 className="mt-2 flex items-center gap-2.5 text-3xl font-black uppercase tracking-tight text-ink sm:text-4xl">
            <FiCrosshair className="shrink-0 text-accent" />
            Alignment
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            {hasTarget
              ? `Guiding your telescope to ${feed.target.target.name}.`
              : "Your phone is streaming. Pick a target and guidance starts instantly."}
          </p>
        </div>
        <ConnectionIndicator tone="connected" label="Phone connected" />
      </motion.header>

      {/* Body — one column until there's something to guide toward. */}
      <div
        className={`mt-8 grid items-start gap-4 ${
          hasTarget ? "lg:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {/* Left: instrumentation */}
        <div className="flex min-w-0 flex-col gap-4">
          <SessionPanel />
          <OrientationPanel feed={orientation} />
          <EnginePanel feed={feed} />
          <TargetPicker
            feed={feed}
            targets={tonight.targets}
            isLoading={tonight.isLoading}
            compact={hasTarget}
          />
        </div>

        {/* Right: the visual guide, once a target exists. */}
        {hasTarget && (
          <div className="min-w-0">
            <GuideViewport
              feed={feed}
              orientation={orientation}
              hasObserver={hasLocation}
              onClearTarget={feed.clearTarget}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Full-page precondition state — one reason, one way forward. */
function Gate({ icon: Icon, title, body, cta }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center px-6 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center border border-accent/30 bg-accent/10 text-accent">
        <Icon size={24} />
      </span>
      <h1 className="mt-5 text-lg font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{body}</p>
      <Link
        to="/dashboard"
        className="mt-6 inline-block bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hi"
      >
        {cta}
      </Link>
    </div>
  );
}
