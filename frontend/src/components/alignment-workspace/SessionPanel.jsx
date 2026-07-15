import { useEffect, useState } from "react";
import { FiSmartphone } from "react-icons/fi";
import { usePairing } from "../../context/PairingContext";
import Button from "../ui/Button";
import { Panel, Field } from "./Panel";

/**
 * WebSocket session + paired device telemetry.
 *
 * The dashboard's ConnectedDeviceCard says "a phone is attached"; this says
 * what the link actually IS — room, transport, device, uptime — because the
 * workspace is where you debug a session that misbehaves.
 */

const TONE = {
  connected: { tone: "connected", label: "Connected" },
  waiting: { tone: "waiting", label: "Waiting for phone" },
  creating: { tone: "connecting", label: "Starting session" },
  expired: { tone: "error", label: "Expired" },
  error: { tone: "error", label: "Error" },
  idle: { tone: "waiting", label: "No session" },
};

function formatTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** 1Hz re-render, so uptime counts while the rest of the panel sits still. */
function useSecondTick(enabled) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [enabled]);
}

function uptime(since) {
  if (!since) return "—";
  const secs = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function SessionPanel() {
  const { pairing, disconnectPairing } = usePairing();
  const { status, roomId, phone } = pairing;

  useSecondTick(status === "connected");

  const indicator = TONE[status] ?? TONE.idle;

  return (
    <Panel
      icon={<FiSmartphone className="text-base" />}
      title="Session"
      indicator={indicator}
      actions={
        status === "connected" ? (
          <Button variant="danger" size="sm" onClick={disconnectPairing}>
            Disconnect
          </Button>
        ) : null
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <Field label="Device" value={phone?.device || "—"} mono={false} />
        <Field label="Room" value={roomId || "—"} />
        <Field label="Socket" value={phone?.socketId || "—"} />
        <Field label="Transport" value="socket.io · ws" />
        <Field label="Paired at" value={formatTime(phone?.connectedAt)} />
        <Field
          label="Uptime"
          value={uptime(phone?.connectedAt)}
          valueClass={status === "connected" ? "text-success" : "text-ink"}
        />
      </div>

      {pairing.error && (
        <p className="mt-3 border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {pairing.error}
        </p>
      )}
    </Panel>
  );
}
