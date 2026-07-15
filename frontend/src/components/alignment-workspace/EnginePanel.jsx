import { FiCrosshair } from "react-icons/fi";
import { Panel, Field, BigField } from "./Panel";
import { fmt } from "./format";

/**
 * Alignment Engine readout — the backend engine's per-packet verdict.
 *
 * The Session-14 numeric readout, restored as a first-class panel. Session 15
 * banished it to the overlay's opt-in telemetry corner because the overlay was
 * a full-screen immersive scene with no room for numbers; the workspace has a
 * column for exactly this, so the engine gets to speak plainly again.
 *
 * Error sign convention comes from the engine (see WEBSOCKET_PROTOCOL.md):
 * positive horizontal = rotate clockwise, positive vertical = raise the tube.
 */

const STATE_TONE = {
  searching: { tone: "waiting", label: "Searching" },
  close: { tone: "waiting", label: "Close" },
  nearly_aligned: { tone: "waiting", label: "Nearly Aligned" },
  locked: { tone: "connected", label: "Locked" },
  below_horizon: { tone: "error", label: "Below Horizon" },
  lost: { tone: "error", label: "Signal Lost" },
  idle: { tone: "waiting", label: "Idle" },
};

/** "3.4° clockwise" reads; "+3.4°" needs a decoder ring. */
function horizontalHint(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  if (Math.abs(v) < 0.05) return "on axis";
  return `${Math.abs(v).toFixed(2)}° ${v > 0 ? "clockwise" : "anticlockwise"}`;
}

function verticalHint(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  if (Math.abs(v) < 0.05) return "on axis";
  return `${Math.abs(v).toFixed(2)}° ${v > 0 ? "up" : "down"}`;
}

export default function EnginePanel({ feed }) {
  const u = feed.update;
  const indicator = feed.target
    ? (STATE_TONE[feed.state] ?? STATE_TONE.searching)
    : { tone: "waiting", label: "No target" };

  return (
    <Panel
      icon={<FiCrosshair className="text-base" />}
      title="Alignment Engine"
      indicator={indicator}
    >
      {!feed.target ? (
        <p className="text-xs text-ink-3">
          No target set. Pick one below and the engine starts guiding
          immediately.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <BigField
              label="Angular Error"
              value={u ? `${fmt(u.angular_error, 2)}°` : "—"}
              valueClass={feed.state === "locked" ? "text-success" : ""}
            />
            <BigField
              label="Target Alt"
              value={u ? `${fmt(u.target_altitude, 1)}°` : "—"}
              valueClass={u && !u.above_horizon ? "text-danger" : ""}
            />
            <BigField
              label="Target Az"
              value={u ? `${fmt(u.target_azimuth, 1)}°` : "—"}
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <Field
              label="Horizontal"
              value={horizontalHint(u?.horizontal_error)}
              mono={false}
            />
            <Field
              label="Vertical"
              value={verticalHint(u?.vertical_error)}
              mono={false}
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Field
              label="Confidence"
              value={u?.confidence != null ? u.confidence : "—"}
              valueClass={
                u?.confidence != null && u.confidence <= 30 ? "text-accent" : ""
              }
            />
            <Field
              label="Above Horizon"
              value={u ? (u.above_horizon ? "Yes" : "No") : "—"}
              valueClass={u && !u.above_horizon ? "text-danger" : ""}
            />
            <Field
              label="Ephemeris Age"
              value={u?.ephemeris_age_s != null ? `${u.ephemeris_age_s}s` : "—"}
            />
            <Field
              label="Packet"
              value={u?.seq != null ? `#${u.seq}` : "—"}
              valueClass={feed.stale ? "text-danger" : ""}
            />
          </div>

          {u?.confidence != null && u.confidence <= 30 && (
            <p className="mt-2 border border-accent/30 bg-accent/10 px-3 py-2 text-[11px] text-accent-hi">
              Low confidence — this phone has no compass reference, so azimuth
              is relative. Altitude is still trustworthy.
            </p>
          )}
        </>
      )}

      {feed.error && (
        <p className="mt-2 border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {feed.error.message || "The alignment engine reported an error."}
          {feed.error.code && (
            <span className="ml-1 font-mono text-[10px] text-ink-3">
              {feed.error.code}
            </span>
          )}
        </p>
      )}
    </Panel>
  );
}
