import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil, RotateCcw, Trash2, X } from "lucide-react";

import { useObservations } from "../../hooks/useObservations";
import { compassPoint, formatDegrees } from "../tonight/vocabulary";

/**
 * The observation plan — tonight's queue and the growing life list.
 *
 * Planned entries are merged with live sky geometry (by catalog_id) so each
 * row answers "can I point at this right now?": up + where + until when, or
 * below the horizon. One tap resolves an entry (Observed / Skip), notes edit
 * inline, history re-queues with a tap. All science comes from useTonight's
 * data passed in — this card never computes astronomy.
 */

function NotesEditor({ entry, onSave, onCancel, saving }) {
  const [draft, setDraft] = useState(entry.notes || "");
  return (
    <div className="mt-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Eyepiece, sky, what you saw…"
        autoFocus
        className="w-full resize-none border border-line bg-surface-3 px-3 py-2 text-xs text-ink placeholder-ink-3 outline-none transition-colors focus:border-accent"
      />
      <div className="mt-1.5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-xs text-ink-3 transition-colors hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(draft.trim())}
          className="bg-accent px-3 py-1 text-xs font-semibold text-ink transition-colors hover:bg-accent-hi disabled:opacity-60"
        >
          Save note
        </button>
      </div>
    </div>
  );
}

/** "Up now · 45° SSW · sets 23:41" | "Below horizon" — from live geometry. */
function skyStatus(live) {
  if (!live) return { up: false, label: "Below horizon right now" };
  const bits = [
    `Up now · ${formatDegrees(live.altitude_deg)} ${compassPoint(live.azimuth_deg)}`,
  ];
  if (live.circumpolar) bits.push("up all night");
  else if (live.set) bits.push(`sets ${live.set}`);
  return { up: true, label: bits.join(" · ") };
}

function PlannedRow({ entry, live, update, remove }) {
  const [editing, setEditing] = useState(false);
  const status = skyStatus(live);

  const resolve = (to) =>
    update.mutate({ id: entry._id, changes: { status: to } });

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.25 }}
      className="border border-line bg-surface-3 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${
            status.up ? "bg-success" : "bg-ink-4"
          }`}
        />
        <div className="min-w-0 flex-1">
          <Link
            to={`/tonight/${entry.catalog_id}`}
            className="block truncate text-sm font-semibold text-ink transition-colors hover:text-accent"
          >
            {live?.name || entry.catalog_id}
            <span className="ml-2 text-xs font-normal text-ink-3">
              {entry.catalog_id}
            </span>
          </Link>
          <p className="truncate text-[11px] text-ink-2">{status.label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => resolve("observed")}
            title="Mark observed"
            className="flex h-8 w-8 items-center justify-center border border-success/25 bg-success/10 text-success transition-colors hover:bg-success/20"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => resolve("skipped")}
            title="Skip"
            className="flex h-8 w-8 items-center justify-center border border-line bg-surface-2 text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <X size={14} />
          </button>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            title={entry.notes ? "Edit note" : "Add note"}
            className={`flex h-8 w-8 items-center justify-center border transition-colors ${
              entry.notes
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-line bg-surface-2 text-ink-3 hover:text-ink"
            }`}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => remove.mutate(entry._id)}
            title="Remove from plan"
            className="flex h-8 w-8 items-center justify-center border border-line bg-surface-2 text-ink-3 transition-colors hover:border-danger hover:text-danger"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {!editing && entry.notes && (
        <p className="mt-2 border-l-2 border-line pl-3 text-xs italic leading-relaxed text-ink-2">
          {entry.notes}
        </p>
      )}
      {editing && (
        <NotesEditor
          entry={entry}
          saving={update.isPending}
          onCancel={() => setEditing(false)}
          onSave={(notes) => {
            update.mutate({ id: entry._id, changes: { notes } });
            setEditing(false);
          }}
        />
      )}
    </motion.li>
  );
}

function HistoryRow({ entry, update }) {
  const observed = entry.status === "observed";
  const when = entry.resolvedAt
    ? new Date(entry.resolvedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "";
  return (
    <li className="flex items-center gap-3 border-b border-line py-2 text-xs last:border-0">
      <span
        className={`shrink-0 font-semibold ${
          observed ? "text-success" : "text-ink-3"
        }`}
      >
        {observed ? "✓" : "—"}
      </span>
      <span className="min-w-0 flex-1 truncate text-ink-2">
        <Link
          to={`/tonight/${entry.catalog_id}`}
          className="font-medium text-ink transition-colors hover:text-accent"
        >
          {entry.catalog_id}
        </Link>
        {" · "}
        {observed ? "observed" : "skipped"} {when}
        {entry.notes && (
          <span className="text-ink-3"> — “{entry.notes}”</span>
        )}
      </span>
      <button
        type="button"
        onClick={() =>
          update.mutate({ id: entry._id, changes: { status: "planned" } })
        }
        title="Back onto the plan"
        className="shrink-0 text-ink-3 transition-colors hover:text-accent"
      >
        <RotateCcw size={13} />
      </button>
    </li>
  );
}

export default function PlannerCard({ targets, catalogTotal }) {
  const navigate = useNavigate();
  const { planned, history, isLoading, isError, update, remove } =
    useObservations();
  const [showAllHistory, setShowAllHistory] = useState(false);

  const liveById = useMemo(() => {
    const map = new Map();
    for (const t of targets) map.set(t.catalog_id, t);
    return map;
  }, [targets]);

  const observedDistinct = useMemo(
    () =>
      new Set(
        history
          .filter((o) => o.status === "observed")
          .map((o) => o.catalog_id),
      ).size,
    [history],
  );

  const shownHistory = showAllHistory ? history : history.slice(0, 5);

  return (
    <div className="flex h-full flex-col border border-line bg-surface-2 p-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
            Observation plan
          </p>
          <p className="mt-1 text-xs text-ink-3">
            {planned.length} queued
            {catalogTotal > 0 &&
              ` · life list ${observedDistinct}/${catalogTotal}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/tonight")}
          className="shrink-0 text-xs font-medium text-ink-2 transition-colors duration-300 hover:text-accent"
        >
          Find targets →
        </button>
      </div>

      <div className="mt-4 flex-1">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[52px] animate-pulse bg-surface-3" />
            ))}
          </div>
        ) : isError ? (
          <p className="border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            Couldn't load your plan — check the gateway and retry.
          </p>
        ) : planned.length === 0 ? (
          <p className="border border-line bg-surface-3 px-4 py-3 text-sm text-ink-2">
            Nothing queued yet. Tap{" "}
            <span className="font-semibold text-accent">+</span> on any
            target — here, or in tonight's full report.
          </p>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {planned.map((entry) => (
                <PlannedRow
                  key={entry._id}
                  entry={entry}
                  live={liveById.get(entry.catalog_id)}
                  update={update}
                  remove={remove}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-5 border-t border-line pt-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-3">
              History
            </p>
            {history.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllHistory((v) => !v)}
                className="text-[11px] text-ink-3 transition-colors hover:text-ink"
              >
                {showAllHistory ? "Show less" : `All ${history.length}`}
              </button>
            )}
          </div>
          <ul className="mt-1">
            {shownHistory.map((entry) => (
              <HistoryRow key={entry._id} entry={entry} update={update} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
