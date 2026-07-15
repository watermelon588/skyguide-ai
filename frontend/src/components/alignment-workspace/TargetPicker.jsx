import { FiList } from "react-icons/fi";
import { motion } from "framer-motion";
import TargetGlyph from "../alignment-mode/TargetGlyph";
import { Panel } from "./Panel";

/**
 * Tonight's ranked targets, one click from guidance.
 *
 * Replaces the overlay's free-text "search the catalog — M13, M104…" field.
 * Typing a catalog id was the worst kind of interface: it demanded the user
 * already know the answer, and punished a typo with TARGET_NOT_FOUND. These
 * come from useTonight — the same live, engine-ranked, above-horizon list the
 * dashboard and /tonight show — so every card here is guaranteed to resolve.
 *
 * Resolution still stays backend-side: a click is feed.setTarget(catalogId) →
 * alignment:set_target, exactly as before.
 */
export default function TargetPicker({ feed, targets, isLoading, compact = false }) {
  const trackingId = feed.target?.target?.catalog_id ?? null;

  return (
    <Panel
      icon={<FiList className="text-base" />}
      title={compact ? "Switch target" : "Tonight's targets"}
      indicator={
        targets.length
          ? { tone: "connected", label: `${targets.length} up` }
          : undefined
      }
    >
      {isLoading ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse border border-line bg-surface-3" />
          ))}
        </div>
      ) : targets.length === 0 ? (
        <p className="text-xs text-ink-3">
          Nothing from the catalog is above your horizon right now. Check back
          later tonight, or confirm your observing location is set.
        </p>
      ) : (
        <>
          <div
            className={`grid gap-2 ${
              compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"
            }`}
          >
            {targets.map((t, i) => {
              const tracking = trackingId === t.catalog_id;
              const pending = feed.pending && !tracking;
              return (
                <motion.button
                  key={t.catalog_id}
                  type="button"
                  onClick={() => feed.setTarget(t.catalog_id)}
                  disabled={feed.pending || tracking}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03 }}
                  className={`group flex min-h-[44px] items-center gap-3 border px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed ${
                    tracking
                      ? "border-accent/50 bg-accent/10"
                      : "border-line bg-surface-3 hover:bg-surface-2 hover:outline hover:outline-1 hover:outline-accent"
                  } ${pending ? "opacity-50" : ""}`}
                >
                  <span className="shrink-0 text-accent">
                    <TargetGlyph objectType={t.object_type} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {t.name}
                    </span>
                    <span className="block truncate text-[11px] text-ink-3">
                      {t.catalog_id} · {fmtAlt(t.altitude_deg)} ·{" "}
                      {t.object_type}
                    </span>
                  </span>
                  {tracking && (
                    <span
                      className="h-2 w-2 shrink-0 bg-success"
                      title="Currently tracking"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {feed.error?.code === "TARGET_NOT_FOUND" && (
            <p className="mt-3 text-xs text-ink-2" role="status">
              That target isn't in the seeded catalog. Pick another from the list
              above.
            </p>
          )}
        </>
      )}
    </Panel>
  );
}

const fmtAlt = (v) =>
  typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(0)}° up` : "—";
