import { FiCompass } from "react-icons/fi";
import { Panel, Field, BigField } from "./Panel";
import { fmt } from "./format";

/**
 * Orientation Engine readout — the calibrated phone orientation model.
 *
 * Moved here from the dashboard (OrientationPanelCard): this is workspace
 * instrumentation, and the dashboard is a planning surface. Same feed, same
 * numbers, re-laid-out for a narrow column.
 */

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

export default function OrientationPanel({ feed }) {
  const live = !!feed.model;
  const indicator = {
    tone: live ? "connected" : feed.stale ? "error" : "waiting",
    label: live ? "Live" : feed.stale ? "Stale" : "Waiting",
  };

  return (
    <Panel
      icon={<FiCompass className="text-base" />}
      title="Orientation Engine"
      indicator={indicator}
    >
      {live ? <ModelView feed={feed} /> : <p className="text-xs text-ink-3">{emptyMessage(feed)}</p>}
    </Panel>
  );
}

function ModelView({ feed }) {
  const m = feed.model;
  const cal =
    CALIBRATION_LABEL[m.calibration?.status] ?? CALIBRATION_LABEL.initializing;

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <BigField label="Heading" value={`${fmt(m.heading, 1)}°`} />
        <BigField label="Pitch" value={`${fmt(m.pitch, 1)}°`} />
        <BigField
          label="Roll"
          value={`${fmt(m.roll, 1)}°${m.gimbal ? " *" : ""}`}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field
          label="Confidence"
          value={m.confidence}
          valueClass={CONFIDENCE_TONE[m.confidence]}
        />
        <Field label="Calibration" value={cal.text} valueClass={cal.tone} />
        <Field label="North Ref" value={m.calibration?.source ?? "—"} />
        <Field
          label="Offset"
          value={m.calibration?.offset != null ? `${m.calibration.offset}°` : "—"}
        />
        <Field label="Sensor Rate" value={`${fmt(m.inputRateHz, 0)} Hz`} />
        <Field label="Stream Rate" value={`${feed.rate}/s`} />
        <Field
          label="Dropped"
          value={feed.dropped}
          valueClass={feed.dropped > 0 ? "text-danger" : ""}
        />
        <Field
          label="Last Update"
          value={feed.ageMs != null ? `${feed.ageMs} ms` : "—"}
          valueClass={feed.stale ? "text-danger" : ""}
        />
      </div>

      <div className="mt-2 border border-line bg-surface-3 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-ink-3">
          Quaternion (screen → world)
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-ink-2">
          w {fmt(m.quaternion?.w, 4)} · x {fmt(m.quaternion?.x, 4)} · y{" "}
          {fmt(m.quaternion?.y, 4)} · z {fmt(m.quaternion?.z, 4)}
        </p>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-ink-3">
        Stream rate tracks motion by design (unchanged poses are deduplicated to
        a keepalive).
        {m.gimbal && " *Roll referenced to North near zenith/nadir."}
        {m.calibration?.status === "unreferenced" &&
          " Heading is relative — this device provides no compass reference."}
      </p>
    </>
  );
}
