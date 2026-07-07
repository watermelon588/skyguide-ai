import { useState } from "react";
import { motion } from "framer-motion";
import { FiCrosshair } from "react-icons/fi";
import {
  DASHBOARD_CARD_SHELL,
  DASHBOARD_CARD_MOTION,
  CardIdentity,
} from "./DashboardCard";
import ConnectionIndicator from "../alignment/ConnectionIndicator";
import { useAlignmentFeed } from "../../hooks/useAlignmentFeed";

/**
 * Alignment engine panel (Session 14) — augments the orientation debug panel
 * with the backend's realtime alignment stream: target position, telescope
 * pointing, errors and lock state. Numbers only — visual guidance (arrows,
 * reticles) belongs to Session 15.
 */
export default function AlignmentPanelCard() {
  const feed = useAlignmentFeed();

  if (!feed.paired) return null;

  return (
    <motion.section
      {...DASHBOARD_CARD_MOTION}
      className={`${DASHBOARD_CARD_SHELL} py-4`}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <CardIdentity
          icon={<FiCrosshair className="text-lg text-orange-400" />}
          title="Alignment Engine"
          subtitle="Backend telescope ↔ target comparison"
          className="flex-1"
          trailing={
            <span className="ml-2 shrink-0">
              <StateBadge state={feed.target ? feed.state : null} />
            </span>
          }
        />
      </div>

      <TargetForm feed={feed} />

      {feed.error && (
        <p className="mt-3 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">
          {feed.error.message}
        </p>
      )}

      {feed.target && (feed.update ? (
        <LiveReadout update={feed.update} />
      ) : (
        <p className="mt-4 text-xs text-[#6B7280]">
          {feed.state === "lost" || feed.stale
            ? "Orientation stream went silent — alignment paused until the phone resumes."
            : `Tracking ${feed.target.target?.name ?? "target"} — waiting for orientation packets.`}
        </p>
      ))}
    </motion.section>
  );
}

const STATES = {
  searching: { label: "Searching", tone: "waiting" },
  close: { label: "Close", tone: "waiting" },
  nearly_aligned: { label: "Nearly Aligned", tone: "waiting" },
  locked: { label: "Locked", tone: "connected" },
  below_horizon: { label: "Below Horizon", tone: "error" },
  lost: { label: "Signal Lost", tone: "error" },
};

function StateBadge({ state }) {
  const s = STATES[state];
  if (!s) return <ConnectionIndicator tone="waiting" label="No Target" />;
  return <ConnectionIndicator tone={s.tone} label={s.label} />;
}

function TargetForm({ feed }) {
  const [query, setQuery] = useState("");
  const canSubmit = query.trim().length > 0 && !feed.pending;

  const submit = (e) => {
    e.preventDefault();
    if (canSubmit) feed.setTarget(query.trim());
  };

  return (
    <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Catalog id — e.g. M42"
        className="w-40 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white placeholder-[#6B7280] outline-none transition focus:border-orange-400/50"
      />
      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-xl border border-orange-400/40 bg-orange-500/15 px-3 py-1.5 text-xs font-semibold text-orange-300 transition hover:bg-orange-500/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {feed.pending ? "Locating…" : "Set Target"}
      </button>
      {feed.target && (
        <>
          <button
            type="button"
            onClick={feed.clearTarget}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#AAB4C5] transition hover:bg-white/10"
          >
            Clear
          </button>
          <span className="text-xs text-[#AAB4C5]">
            Tracking{" "}
            <span className="font-semibold text-white">
              {feed.target.target?.name}
            </span>
            {feed.target.target?.catalog_id &&
              ` (${feed.target.target.catalog_id})`}
          </span>
        </>
      )}
    </form>
  );
}

function LiveReadout({ update }) {
  const err = (v) =>
    v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}°`;

  return (
    <>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <BigValue label="Angular Error" value={`${fmt(update.angular_error, 2)}°`} highlight={update.aligned} />
        <BigValue label="Horizontal Δ" value={err(update.horizontal_error)} />
        <BigValue label="Vertical Δ" value={err(update.vertical_error)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Target Alt" value={`${fmt(update.target_altitude, 2)}°`} />
        <Metric label="Target Az" value={`${fmt(update.target_azimuth, 2)}°`} />
        <Metric label="Scope Heading" value={`${fmt(update.telescope?.heading, 1)}°`} />
        <Metric label="Scope Pitch" value={`${fmt(update.telescope?.pitch, 1)}°`} />
        <Metric
          label="Confidence"
          value={update.confidence != null ? `${update.confidence}%` : "—"}
          valueClass={confidenceTone(update.confidence)}
        />
        <Metric
          label="Ephemeris Age"
          value={update.ephemeris_age_s != null ? `${update.ephemeris_age_s}s` : "—"}
        />
      </div>

      {!update.above_horizon && (
        <p className="mt-3 text-[10px] text-[#EF4444]">
          Target is below the horizon — alignment errors are still computed
          but the object is not observable.
        </p>
      )}
      <p className="mt-3 text-[10px] text-[#6B7280]">
        Positive Δ = move clockwise / raise the tube. Computed by the backend
        from the live orientation stream.
      </p>
    </>
  );
}

function BigValue({ label, value, highlight = false }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-center ${
        highlight
          ? "border-[#22C55E]/40 bg-[#22C55E]/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-[#6B7280]">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-lg font-bold ${
          highlight ? "text-[#22C55E]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Metric({ label, value, valueClass }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-[#6B7280]">
        {label}
      </p>
      <p className={`mt-0.5 truncate font-mono text-xs ${valueClass ?? "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function confidenceTone(c) {
  if (c == null) return "text-white";
  if (c >= 75) return "text-[#22C55E]";
  if (c >= 45) return "text-orange-400";
  return "text-[#EF4444]";
}

const fmt = (v, d) =>
  typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "—";
