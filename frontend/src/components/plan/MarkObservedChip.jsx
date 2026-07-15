import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { useObservations } from "../../hooks/useObservations";

/**
 * One-tap observation logging for the moment a target locks in Alignment
 * Mode: resolves the planned entry to "observed", or — if the target was
 * never planned — creates it and resolves it in one gesture. Zero typing at
 * the tripod; the note can wait for morning coffee.
 *
 * Self-contained (owns its data + state machine) so GuidanceChrome stays a
 * dumb layer that merely decides *when* to show it.
 */
export default function MarkObservedChip({ catalogId, className = "" }) {
  const { plannedByCatalogId, add, update } = useObservations();
  const [state, setState] = useState("idle"); // idle | saving | done

  // A new target is a new logging decision — reset during render (React's
  // documented adjust-state-on-prop-change pattern; no effect, no cascade).
  const [lastId, setLastId] = useState(catalogId);
  if (lastId !== catalogId) {
    setLastId(catalogId);
    setState("idle");
  }

  const onClick = async () => {
    if (state !== "idle" || !catalogId) return;
    setState("saving");
    try {
      const planned = plannedByCatalogId.get(catalogId);
      if (planned) {
        await update.mutateAsync({
          id: planned._id,
          changes: { status: "observed" },
        });
      } else {
        const created = await add.mutateAsync({ catalog_id: catalogId });
        await update.mutateAsync({
          id: created._id,
          changes: { status: "observed" },
        });
      }
      setState("done");
    } catch {
      // Failed (offline, session lapsed, stale plan) — recoverable: let the
      // observer simply tap again.
      setState("idle");
    }
  };

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      disabled={state !== "idle"}
      aria-label={
        state === "done"
          ? `${catalogId} logged as observed`
          : `Mark ${catalogId} as observed`
      }
      className={`pointer-events-auto flex items-center gap-2 border px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
        state === "done"
          ? "cursor-default border-success/40 bg-success/15 text-success"
          : "border-line bg-surface-2 text-ink hover:bg-surface-3"
      } ${className}`}
    >
      <Check size={14} className={state === "done" ? "" : "text-success"} />
      {state === "done"
        ? "Logged"
        : state === "saving"
          ? "Logging…"
          : "Mark observed"}
    </motion.button>
  );
}
