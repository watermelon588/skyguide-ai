import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AlignmentMode from "../components/alignment-mode/AlignmentMode";
import { circularDelta, normalizeHeading } from "../services/orientation/orientationMath";
import Button from "../components/ui/Button";

/**
 * DEV-ONLY Alignment Mode lab (/align-lab).
 *
 * Drives the full immersive experience with a SIMULATED feed so the scene,
 * states, and motion can be exercised without a phone, telescope, or
 * backend. The tiny state machine below intentionally mimics the backend
 * alignment engine's thresholds (10°/3°/1°, 600ms hold, 1.6° release) —
 * it is test scaffolding for the UI, not frontend science, and this page
 * is excluded from production builds (route is DEV-gated in App.jsx).
 *
 * Controls: Arrow keys / WASD slew the "telescope". Panel toggles force
 * each edge state. The real experience consumes useAlignmentFeed instead.
 */

const FAKE_CATALOG = {
  M42: { name: "Orion Nebula", object_type: "Emission Nebula" },
  M31: { name: "Andromeda Galaxy", object_type: "Galaxy" },
  M45: { name: "Pleiades", object_type: "Open Cluster" },
  M13: { name: "Hercules Cluster", object_type: "Globular Cluster" },
  M8: { name: "Lagoon Nebula", object_type: "Emission Nebula" },
  M57: { name: "Ring Nebula", object_type: "Planetary Nebula" },
  M51: { name: "Whirlpool Galaxy", object_type: "Galaxy" },
};

const TICK_MS = 100; // 10Hz, matching the gateway's alignment:update cadence
const SLEW_DEG_S = 14;
const COMMIT_MS = 250;

export default function AlignLab() {
  const [open, setOpen] = useState(true);

  // Simulation switches
  const [paused, setPaused] = useState(false); // stop packets → lost
  const [unreferenced, setUnreferenced] = useState(false);
  const [lowConfidence, setLowConfidence] = useState(false);
  const [forceBelow, setForceBelow] = useState(false);
  const [denied, setDenied] = useState(false);

  // Chrome-facing state (committed at 4Hz, like the real hook)
  const [chrome, setChrome] = useState({
    update: null,
    state: null,
    stale: false,
  });
  const [target, setTargetState] = useState(null);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const packetRef = useRef({ update: null, receivedAt: null });
  const simRef = useRef({
    scope: { az: 180, alt: 2 },
    target: { az: 95, alt: 30, drift: 0.004 },
    keys: new Set(),
    seq: 0,
    lockSince: null,
    locked: false,
    state: "searching",
    lastPacketAt: null,
  });
  const flagsRef = useRef({});
  useEffect(() => {
    flagsRef.current = { paused, unreferenced, lowConfidence, forceBelow, denied, target };
  }, [paused, unreferenced, lowConfidence, forceBelow, denied, target]);

  const setTarget = useCallback((request) => {
    const id = (typeof request === "string" ? request : request?.catalogId ?? "")
      .trim()
      .toUpperCase();
    setPending(true);
    setError(null);
    setTimeout(() => {
      const entry = FAKE_CATALOG[id];
      if (!entry) {
        setPending(false);
        setError({ code: "TARGET_NOT_FOUND", message: "That target is not in the catalog." });
        return;
      }
      const sim = simRef.current;
      sim.target.az = 60 + Math.random() * 240;
      sim.target.alt = 12 + Math.random() * 48;
      sim.locked = false;
      sim.lockSince = null;
      sim.state = "searching";
      setPending(false);
      setTargetState({
        target: { catalog_id: id, name: entry.name, object_type: entry.object_type },
        telescope: null,
        ephemeris: {},
        at: Date.now(),
      });
    }, 450);
  }, []);

  const clearTarget = useCallback(() => {
    setTargetState(null);
    setChrome({ update: null, state: null, stale: false });
    packetRef.current = { update: null, receivedAt: null };
  }, []);

  // ---- 10Hz simulation loop ------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      const sim = simRef.current;
      const flags = flagsRef.current;
      if (!flags.target || flags.paused || flags.denied) return;

      // Slew from held keys
      const dt = TICK_MS / 1000;
      const k = sim.keys;
      const dAz =
        ((k.has("ArrowRight") || k.has("d") ? 1 : 0) -
          (k.has("ArrowLeft") || k.has("a") ? 1 : 0)) * SLEW_DEG_S * dt;
      const dAlt =
        ((k.has("ArrowUp") || k.has("w") ? 1 : 0) -
          (k.has("ArrowDown") || k.has("s") ? 1 : 0)) * SLEW_DEG_S * dt;
      sim.scope.az = normalizeHeading(sim.scope.az + dAz);
      sim.scope.alt = Math.max(-30, Math.min(89, sim.scope.alt + dAlt));

      // Sky drift + optional below-horizon forcing
      sim.target.az = normalizeHeading(sim.target.az + sim.target.drift * dt * 10);
      const targetAlt = flags.forceBelow ? -8 : sim.target.alt;

      const h = circularDelta(sim.target.az, sim.scope.az);
      const v = targetAlt - sim.scope.alt;
      const midAlt = (((targetAlt + sim.scope.alt) / 2) * Math.PI) / 180;
      const ang = Math.hypot(h * Math.cos(midAlt), v);

      // Mimic the backend state machine (test scaffolding only)
      const now = Date.now();
      let state;
      if (targetAlt <= 0) {
        state = "below_horizon";
        sim.lockSince = null;
        sim.locked = false;
      } else if (sim.locked && ang <= 1.6) {
        state = "locked";
      } else if (ang <= 1) {
        sim.lockSince = sim.lockSince ?? now;
        sim.locked = now - sim.lockSince >= 600;
        state = sim.locked ? "locked" : "nearly_aligned";
      } else {
        sim.lockSince = null;
        sim.locked = false;
        state = ang <= 3 ? "nearly_aligned" : ang <= 10 ? "close" : "searching";
      }
      sim.state = state;
      sim.seq += 1;
      sim.lastPacketAt = now;

      packetRef.current = {
        update: {
          v: 1,
          t: now,
          seq: sim.seq,
          target: {
            id: flags.target.target.catalog_id,
            name: flags.target.target.name,
          },
          target_altitude: Math.round(targetAlt * 1000) / 1000,
          target_azimuth: Math.round(sim.target.az * 1000) / 1000,
          above_horizon: targetAlt > 0,
          telescope: {
            heading: Math.round(sim.scope.az * 100) / 100,
            pitch: Math.round(sim.scope.alt * 100) / 100,
          },
          horizontal_error: Math.round(h * 100) / 100,
          vertical_error: Math.round(v * 100) / 100,
          angular_error: Math.round(ang * 100) / 100,
          state,
          aligned: state === "locked",
          confidence: flags.unreferenced ? 28 : flags.lowConfidence ? 40 : 93,
          ephemeris_age_s: Math.round(((now / 1000) % 25) * 10) / 10,
        },
        receivedAt: now,
      };
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // ---- 4Hz chrome commit (mirrors useAlignmentFeed) -------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      const { update, receivedAt } = packetRef.current;
      const stale = !!receivedAt && Date.now() - receivedAt > 2000;
      const sim = simRef.current;
      setChrome({
        update: stale ? null : update,
        state: stale ? "lost" : (update?.state ?? sim.state ?? null),
        stale,
      });
    }, COMMIT_MS);
    return () => clearInterval(timer);
  }, []);

  // ---- keyboard ------------------------------------------------------------
  useEffect(() => {
    const down = (e) => simRef.current.keys.add(e.key);
    const up = (e) => simRef.current.keys.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const feed = useMemo(
    () => ({
      paired: true,
      target,
      update: chrome.update,
      stale: chrome.stale,
      state: target ? chrome.state : null,
      error,
      pending,
      setTarget,
      clearTarget,
      packetRef,
    }),
    [target, chrome, error, pending, setTarget, clearTarget],
  );

  const orientation = useMemo(
    () => ({
      model: {
        calibration: unreferenced
          ? { source: "none", status: "unreferenced" }
          : { source: "absolute", status: "calibrated" },
      },
      status: denied
        ? { reason: "permission_denied", streaming: false }
        : paused
          ? { reason: "background", streaming: false }
          : { reason: "probed", streaming: true },
      stale: paused,
    }),
    [unreferenced, denied, paused],
  );

  return (
    <div className="min-h-screen bg-[#05070A] text-ink">
      <AlignmentMode
        open={open}
        feed={feed}
        orientation={orientation}
        hasObserver
        onExit={() => setOpen(false)}
      />

      {!open && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <p className="text-sm text-ink-2">Alignment Mode lab (dev only)</p>
          <Button onClick={() => setOpen(true)}>Relaunch Alignment Mode</Button>
        </div>
      )}

      {/* Sim controls float above the overlay */}
      <details
        open
        className="fixed bottom-3 left-3 z-[970] w-[260px] border border-line bg-[#0B0D12]/90 p-3 text-xs shadow-2xl"
      >
        <summary className="cursor-pointer select-none font-semibold text-ink-2">
          Sim controls · arrows/WASD slew
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <LabToggle label="Pause stream" value={paused} onChange={setPaused} />
          <LabToggle label="No north ref" value={unreferenced} onChange={setUnreferenced} />
          <LabToggle label="Low confidence" value={lowConfidence} onChange={setLowConfidence} />
          <LabToggle label="Below horizon" value={forceBelow} onChange={setForceBelow} />
          <LabToggle label="Deny permission" value={denied} onChange={setDenied} />
        </div>
      </details>
    </div>
  );
}

function LabToggle({ label, value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`rounded-lg border px-2 py-1.5 text-left transition-colors ${
        value
          ? "border-accent/50 bg-accent/15 text-accent-hi"
          : "border-line bg-surface-2 text-ink-2 hover:bg-surface-3"
      }`}
    >
      {label}
    </button>
  );
}
