import ConnectionIndicator from "./ConnectionIndicator";

/**
 * Compact live streaming state for the phone (/align) once sensors are
 * granted: status dot + per-sensor availability chips. Presentational —
 * all state comes from useSensorStream via SensorPermissionPanel.
 *
 * @param {boolean} streaming  emit loop currently running
 * @param {boolean} paused     page hidden (phone asleep / tab switched)
 * @param {{orientation: string, motion: string}} sensors  "pending"|"available"|"unavailable"
 * @param {number} targetHz    configured stream rate
 */
export default function SensorStreamIndicator({
  streaming,
  paused,
  sensors,
  targetHz,
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

      <div className="mt-3 flex justify-center gap-5">
        <SensorChip name="Orientation" state={sensors.orientation} />
        <SensorChip name="Motion" state={sensors.motion} />
      </div>
    </div>
  );
}

const CHIP_STATE = {
  pending: { label: "probing…", className: "text-[#6B7280]" },
  available: { label: "active", className: "text-[#22C55E]" },
  unavailable: { label: "unavailable", className: "text-[#EF4444]" },
};

function SensorChip({ name, state }) {
  const view = CHIP_STATE[state] ?? CHIP_STATE.pending;
  return (
    <span className="text-[11px] uppercase tracking-wide text-[#6B7280]">
      {name}{" "}
      <span className={`normal-case tracking-normal ${view.className}`}>
        {view.label}
      </span>
    </span>
  );
}
