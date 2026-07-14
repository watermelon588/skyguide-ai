import { motion } from "framer-motion";
import { FiCompass } from "react-icons/fi";
import {
  DASHBOARD_CARD_SHELL,
  DASHBOARD_CARD_MOTION,
  CardIdentity,
} from "./DashboardCard";
import ConnectionIndicator from "../alignment/ConnectionIndicator";
import { useOrientationFeed } from "../../hooks/useOrientationFeed";

/**
 * TEMPORARY developer orientation panel (Session 13) — replaces the raw
 * sensor diagnostics card. Visualizes the calibrated orientation model
 * streamed by the paired phone so the engine can be validated during
 * development. Replaced by the real Alignment UI in a future session.
 *
 * Renders nothing until a phone is paired; updates at 4Hz via
 * useOrientationFeed regardless of stream rate.
 */
export default function OrientationPanelCard() {
  const feed = useOrientationFeed();

  if (!feed.paired) return null;

  const live = !!feed.model;
  const tone = live ? "connected" : feed.stale ? "error" : "waiting";
  const label = live ? "Live" : feed.stale ? "Stale" : "Waiting";

  return (
    <motion.section
      {...DASHBOARD_CARD_MOTION}
      className={`${DASHBOARD_CARD_SHELL} py-4`}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <CardIdentity
          icon={<FiCompass className="text-lg text-accent" />}
          title="Orientation Engine"
          subtitle="Temporary dev panel — calibrated phone orientation"
          className="flex-1"
          trailing={
            <span className="ml-2 shrink-0">
              <ConnectionIndicator tone={tone} label={label} />
            </span>
          }
        />
      </div>

      {live ? (
        <ModelView feed={feed} />
      ) : (
        <p className="mt-4 text-xs text-ink-3">{emptyMessage(feed)}</p>
      )}
    </motion.section>
  );
}

function emptyMessage(feed) {
  const reason = feed.status?.reason;
  if (reason === "permission_denied") {
    return "The phone denied motion access. Grant it on the phone to start streaming.";
  }
  if (reason === "background" && feed.status?.streaming === false) {
    return "Phone screen is off — stream paused, will resume on wake.";
  }
  if (feed.stale) {
    return "Stream went silent — waiting for the phone to resume.";
  }
  return "Paired — waiting for orientation data. Enable motion sensors on your phone.";
}

const CONFIDENCE_TONE = {
  high: "text-success",
  medium: "text-accent",
  low: "text-danger",
  initializing: "text-ink-3",
};

const CALIBRATION_LABEL = {
  calibrated: { text: "Calibrated", tone: "text-success" },
  degraded: { text: "Degraded", tone: "text-accent" },
  unreferenced: { text: "No North Ref", tone: "text-accent" },
  initializing: { text: "Initializing", tone: "text-ink-3" },
};

function ModelView({ feed }) {
  const m = feed.model;
  const cal = CALIBRATION_LABEL[m.calibration?.status] ?? CALIBRATION_LABEL.initializing;

  return (
    <>
      {/* Primary readout — the numbers future alignment will consume. */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <BigValue label="Heading" value={`${fmt(m.heading, 1)}°`} />
        <BigValue label="Pitch" value={`${fmt(m.pitch, 1)}°`} />
        <BigValue
          label="Roll"
          value={`${fmt(m.roll, 1)}°${m.gimbal ? " *" : ""}`}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <Metric
          label="Confidence"
          value={m.confidence}
          valueClass={CONFIDENCE_TONE[m.confidence]}
        />
        <Metric label="Calibration" value={cal.text} valueClass={cal.tone} />
        <Metric
          label="North Ref"
          value={m.calibration?.source ?? "—"}
        />
        <Metric
          label="Offset"
          value={
            m.calibration?.offset != null ? `${m.calibration.offset}°` : "—"
          }
        />
        <Metric label="Sensor Rate" value={`${fmt(m.inputRateHz, 0)} Hz`} />
        <Metric label="Stream Rate" value={`${feed.rate}/s`} />
        <Metric label="Dropped" value={feed.dropped} warn={feed.dropped > 0} />
        <Metric
          label="Last Update"
          value={feed.ageMs != null ? `${feed.ageMs} ms` : "—"}
          warn={feed.stale}
        />
      </div>

      <div className="mt-3 border border-line bg-surface-3 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-ink-3">
          Quaternion (screen → world)
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-ink-2">
          w {fmt(m.quaternion?.w, 4)} · x {fmt(m.quaternion?.x, 4)} · y{" "}
          {fmt(m.quaternion?.y, 4)} · z {fmt(m.quaternion?.z, 4)}
        </p>
      </div>

      <p className="mt-3 text-[10px] text-ink-3">
        Stream rate tracks motion by design (unchanged poses are deduplicated
        to a keepalive).{m.gimbal && " *Roll referenced to North near zenith/nadir."}
        {m.calibration?.status === "unreferenced" &&
          " Heading is relative — this device provides no compass reference."}
      </p>
    </>
  );
}

function BigValue({ label, value }) {
  return (
    <div className="border border-line bg-surface-3 px-3 py-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-ink-3">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

function Metric({ label, value, valueClass, warn = false }) {
  return (
    <div className="border border-line bg-surface-3 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-ink-3">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate font-mono text-xs ${
          valueClass ?? (warn ? "text-danger" : "text-ink")
        }`}
      >
        {value}
      </p>
    </div>
  );
}

const fmt = (v, d) =>
  typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "—";
