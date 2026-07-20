import { IconCheckCircle, IconCrosshair, IconMoon, IconWifiOff } from "./icons";
import { useAlignmentGuide } from "./useAlignmentGuide";

/**
 * The companion's main screen: live observation guidance on the phone.
 *
 * The phone is mounted on the telescope, so this is the display the observer
 * is actually looking at — big type, one instruction per axis, readable at
 * arm's length in the dark. Sign convention comes from the alignment engine:
 * positive horizontal_error → rotate clockwise (right), positive
 * vertical_error → raise the tube (up).
 */
export default function GuideScreen({ stream, room }) {
  const guide = useAlignmentGuide();

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col px-5 py-5">
        <GuideBody guide={guide} display={stream.display} />
      </div>
      <Footer stream={stream} room={room} />
    </div>
  );
}

function GuideBody({ guide, display }) {
  const { target, update, stale, state } = guide;

  if (!target) return <WaitingForTarget display={display} />;

  const name = target.target?.name || target.target?.catalog_id || "Target";

  if (state === "below_horizon") {
    return (
      <Notice
        icon={<IconMoon className="text-3xl text-warning" />}
        name={name}
        state="below_horizon"
        title="Below the horizon"
        body="This target isn't visible from your location right now. Pick another one on your dashboard."
      />
    );
  }

  if (stale || state === "lost" || !update) {
    return (
      <Notice
        icon={<IconWifiOff className="text-3xl text-danger" />}
        name={name}
        state="lost"
        title="Signal lost"
        body="No fresh sensor data. Keep this screen on and the phone steady on the telescope."
      />
    );
  }

  if (state === "locked") {
    return (
      <div className="flex flex-1 flex-col border border-success/40 bg-success/10 px-6 text-center">
        <TargetStrip name={name} state={state} />
        <div className="flex flex-1 flex-col items-center justify-center">
          <IconCheckCircle className="text-6xl text-success" />
          <p className="mt-6 text-4xl font-black uppercase tracking-tight text-success">
            On target
          </p>
          <p className="mt-3 text-sm text-ink-2">
            {name} is in your eyepiece. Enjoy the view.
          </p>
        </div>
      </div>
    );
  }

  // searching / close / nearly_aligned — the working state.
  return (
    <div className="flex flex-1 flex-col">
      <TargetStrip name={name} state={state} />

      <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
        <p className="text-7xl font-black tracking-tight">
          {fmtDeg(update.angular_error)}
          <span className="text-3xl text-ink-3">°</span>
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-ink-3">
          Off target
        </p>
        <ProgressBar error={update.angular_error} />
      </div>

      <div className="grid grid-cols-2 gap-3 pb-2">
        <DirectionTile
          label="Rotate"
          dir={update.horizontal_error >= 0 ? "right" : "left"}
          amount={update.horizontal_error}
        />
        <DirectionTile
          label="Tilt"
          dir={update.vertical_error >= 0 ? "up" : "down"}
          amount={update.vertical_error}
        />
      </div>

      {update.confidence < 30 && (
        <p className="mt-3 border border-warning/30 bg-warning/10 px-4 py-3 text-xs leading-5 text-ink-2">
          No compass reference — sweep the phone in a figure-8 to calibrate,
          then remount it on the telescope.
        </p>
      )}
    </div>
  );
}

/** Target kept in view, one clear reason why guidance is paused. */
function Notice({ icon, name, state, title, body }) {
  return (
    <div className="flex flex-1 flex-col">
      <TargetStrip name={name} state={state} />
      <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
        <span>{icon}</span>
        <h1 className="mt-6 text-2xl font-black uppercase tracking-tight">
          {title}
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-6 text-ink-2">{body}</p>
      </div>
    </div>
  );
}

function TargetStrip({ name, state }) {
  const chip = STATE_CHIP[state] ?? STATE_CHIP.searching;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-4 pt-1">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.3em] text-ink-3">
          Guiding to
        </p>
        <p className="truncate text-lg font-bold">{name}</p>
      </div>
      <span
        className={`shrink-0 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${chip.cls}`}
      >
        {chip.label}
      </span>
    </div>
  );
}

const STATE_CHIP = {
  searching: { label: "Searching", cls: "border-line text-ink-3" },
  close: { label: "Close", cls: "border-accent/40 bg-accent/10 text-accent-hi" },
  nearly_aligned: {
    label: "Almost there",
    cls: "border-accent-hi/50 bg-accent/20 text-accent-hi",
  },
  locked: { label: "Locked", cls: "border-success/40 bg-success/10 text-success" },
  below_horizon: {
    label: "Below horizon",
    cls: "border-warning/40 bg-warning/10 text-warning",
  },
  lost: { label: "Signal lost", cls: "border-danger/40 bg-danger/10 text-danger" },
};

/** Closeness bar: 30°+ away = empty, locked threshold (1°) = full. */
function ProgressBar({ error }) {
  const pct = Math.max(0, Math.min(1, (30 - error) / 29)) * 100;
  return (
    <div className="mt-6 h-1.5 w-full max-w-xs border border-line bg-surface-2">
      <div
        className="h-full bg-accent-hi transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function DirectionTile({ label, dir, amount }) {
  return (
    <div className="flex flex-col items-center border border-line bg-surface-2 px-3 py-4">
      <p className="text-[10px] uppercase tracking-[0.3em] text-ink-3">{label}</p>
      <Chevron dir={dir} />
      <p className="text-xl font-bold">
        {fmtDeg(amount)}
        <span className="text-sm text-ink-3">°</span>
      </p>
      <p className="text-[11px] uppercase tracking-wide text-ink-2">{dir}</p>
    </div>
  );
}

const CHEVRON_ROTATION = { up: 0, right: 90, down: 180, left: 270 };

function Chevron({ dir }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="my-2 h-9 w-9 text-accent-hi"
      style={{ transform: `rotate(${CHEVRON_ROTATION[dir]}deg)` }}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="square"
    >
      <path d="M5 14l7-7 7 7" />
      <path d="M5 20l7-7 7 7" />
    </svg>
  );
}

function WaitingForTarget({ display }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <IconCrosshair className="text-3xl text-accent-hi" />
      <h1 className="mt-6 text-2xl font-black uppercase tracking-tight">
        Streaming
      </h1>
      <p className="mt-3 max-w-xs text-sm leading-6 text-ink-2">
        Your phone's sensors are live. Pick a target on your dashboard and
        guidance appears here instantly.
      </p>
      {display && (
        <div className="mt-8 grid w-full max-w-xs grid-cols-2 gap-3">
          <Readout label="Heading" value={`${display.heading}°`} />
          <Readout label="Pitch" value={`${display.pitch}°`} />
        </div>
      )}
    </div>
  );
}

function Readout({ label, value }) {
  return (
    <div className="border border-line bg-surface-2 px-3 py-3 text-center">
      <p className="text-[10px] uppercase tracking-[0.3em] text-ink-3">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Footer({ stream, room }) {
  const live = stream.streaming && !stream.paused;
  return (
    <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
      <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
        <span
          className={`h-1.5 w-1.5 ${live ? "animate-pulse bg-success" : "bg-ink-4"}`}
        />
        <span className={live ? "text-ink-2" : "text-ink-4"}>
          {live ? `Streaming ${stream.targetHz} Hz` : "Paused"}
        </span>
      </span>
      {stream.display && (
        <span className="font-mono text-[10px] tabular-nums text-ink-3">
          H {stream.display.heading}° · P {stream.display.pitch}°
        </span>
      )}
      <span className="max-w-[90px] truncate font-mono text-[10px] text-ink-4">
        {room}
      </span>
    </footer>
  );
}

/** ≥10° reads as whole degrees; below that one decimal matters. */
function fmtDeg(value) {
  const abs = Math.abs(value ?? 0);
  return abs >= 10 ? Math.round(abs).toString() : abs.toFixed(1);
}
