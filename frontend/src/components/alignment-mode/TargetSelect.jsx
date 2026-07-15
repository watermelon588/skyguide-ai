import { useState } from "react";
import { motion } from "framer-motion";
import { FiSearch, FiX } from "react-icons/fi";
import TargetGlyph from "./TargetGlyph";
import { NOT_FOUND_HINT } from "./copy";

/**
 * The target-choosing moment — same void, same dust idling behind (the
 * canvas stays mounted underneath); choosing a card departs into the
 * guidance scene. Curated picks are Messier showpieces guaranteed to exist
 * in the seeded catalog (the catalog is Messier-only — planets and the Moon
 * are not static catalog objects and would not resolve).
 *
 * Resolution stays backend-side: every choice goes through
 * feed.setTarget(catalogId) → alignment:set_target.
 */

const CURATED = [
  { id: "M42", name: "Orion Nebula", type: "Emission Nebula" },
  { id: "M31", name: "Andromeda Galaxy", type: "Galaxy" },
  { id: "M45", name: "Pleiades", type: "Open Cluster" },
  { id: "M13", name: "Hercules Cluster", type: "Globular Cluster" },
  { id: "M8", name: "Lagoon Nebula", type: "Emission Nebula" },
  { id: "M57", name: "Ring Nebula", type: "Planetary Nebula" },
  { id: "M51", name: "Whirlpool Galaxy", type: "Galaxy" },
];

export default function TargetSelect({ feed, onExit }) {
  const [query, setQuery] = useState("");
  // Which choice is in flight (curated id or "search") — drives the shimmer.
  const [pendingChoice, setPendingChoice] = useState(null);
  const [lastQuery, setLastQuery] = useState("");

  const trackingId = feed.target?.target?.catalog_id ?? null;
  const notFound = feed.error?.code === "TARGET_NOT_FOUND";
  const otherError = feed.error && !notFound ? feed.error.message : null;

  const choose = (id, choiceKey) => {
    if (feed.pending) return;
    setLastQuery(id);
    setPendingChoice(choiceKey);
    feed.setTarget(id);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) choose(q, "search");
  };

  const hint = notFound ? NOT_FOUND_HINT(lastQuery) : null;

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-y-auto px-6 py-16">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-center"
        >
          <h1 className="text-[28px] font-semibold text-ink">
            Choose a target
          </h1>
          <p className="mt-1.5 text-sm text-ink-2">
            Your telescope is paired and ready.
          </p>
        </motion.div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CURATED.map((t, i) => {
            const isPendingCard = feed.pending && pendingChoice === t.id;
            return (
              <motion.button
                key={t.id}
                type="button"
                onClick={() => choose(t.id, t.id)}
                disabled={feed.pending}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.04 * i }}
                className={`group relative flex min-h-[44px] flex-col items-start gap-2 border px-4 py-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed ${
                  isPendingCard
                    ? "border-accent/50 bg-accent/10"
                    : "border-line bg-surface-2 hover:bg-surface-3"
                }`}
              >
                <span className="flex w-full items-center justify-between">
                  <span className="text-accent">
                    <TargetGlyph objectType={t.type} className="h-5 w-5" />
                  </span>
                  {trackingId === t.id && (
                    <span
                      className="h-2 w-2 bg-success"
                      title="Currently tracking"
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {t.name}
                  </span>
                  <span className="block truncate text-[11px] text-ink-3">
                    {t.id} · {t.type}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>

        <motion.form
          onSubmit={submitSearch}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mt-6"
        >
          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the catalog — M13, M104…"
                aria-label="Search the catalog by id"
                className={`w-full border bg-surface-2 py-2.5 pl-10 pr-3 font-mono text-sm text-ink placeholder-ink-3 outline-none transition-colors focus:border-accent/50 ${
                  feed.pending && pendingChoice === "search"
                    ? "border-accent/50"
                    : "border-line"
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={!query.trim() || feed.pending}
              className="border border-accent/40 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent-hi transition-colors hover:bg-accent/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {feed.pending ? "Locating…" : "Track"}
            </button>
          </div>

          {(hint || otherError) && (
            <p className="mt-2.5 text-xs text-ink-2" role="status">
              {hint ?? otherError}
            </p>
          )}
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="mt-8 flex justify-center"
        >
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 text-xs text-ink-3 transition-colors hover:text-ink-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <FiX className="text-sm" />
            {feed.target ? "End alignment" : "Back to dashboard"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
