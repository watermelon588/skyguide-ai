import ConnectionIndicator from "./ConnectionIndicator";

/**
 * Compact live streaming state for the phone (/align) once sensors are
 * granted: status dot, per-sensor availability chips, and a low-frequency
 * heading/pitch digest so the stream can be sanity-checked on the phone
 * itself. Presentational — all state comes from useOrientationStream via
 * SensorPermissionPanel.
 *
 * @param {boolean} streaming  emit loop currently running
 * @param {boolean} paused     page hidden (phone asleep / tab switched)
 * @param {{orientation: string, motion: string}} sensors  "pending"|"available"|"unavailable"
 * @param {number} targetHz    configured stream rate ceiling
 * @param {{heading, pitch, roll, confidence, calibration}|null} display  4Hz digest
 */
export default function SensorStreamIndicator({
  streaming,
  paused,
  sensors,
  targetHz,
  display,
}) {
  const tone = streaming ? "connected" : paused ? "waiting" : "idle";
  const label = streaming
    ? `Streaming @ ${targetHz} Hz`
    : paused
      ? "Paused — screen not visible"
      : "Sensors idle";

  return (
    <div className="text-center">
      <div className="flex justify-center">
        <ConnectionIndicator tone={tone} label={label} />
      </div>

      {streaming && display && (
        <div className="mt-3 flex justify-center gap-4 font-mono text-xs text-ink">
          <span>
            <span className="text-ink-3">HDG </span>
            {display.heading}°
          </span>
          <span>
            <span className="text-ink-3">PITCH </span>
            {display.pitch}°
          </span>
          <span>
            <span className="text-ink-3">ROLL </span>
            {display.roll}°
          </span>
        </div>
      )}

      <div className="mt-3 flex justify-center gap-5">
        <SensorChip name="Orientation" state={sensors.orientation} />
        <SensorChip name="Motion" state={sensors.motion} />
        {streaming && display && (
          <SensorChip name="Confidence" state={display.confidence} />
        )}
      </div>
    </div>
  );
}

const CHIP_STATE = {
  pending: { label: "probing…", className: "text-ink-3" },
  available: { label: "active", className: "text-success" },
  unavailable: { label: "unavailable", className: "text-danger" },
  // Confidence tiers from the orientation model.
  initializing: { label: "initializing", className: "text-ink-3" },
  low: { label: "low", className: "text-danger" },
  medium: { label: "medium", className: "text-accent" },
  high: { label: "high", className: "text-success" },
};

function SensorChip({ name, state }) {
  const view = CHIP_STATE[state] ?? CHIP_STATE.pending;
  return (
    <span className="text-[11px] uppercase tracking-wide text-ink-3">
      {name}{" "}
      <span className={`normal-case tracking-normal ${view.className}`}>
        {view.label}
      </span>
    </span>
  );
}
