import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiX } from "react-icons/fi";
import { TbTelescope } from "react-icons/tb";
import DEMO_TELESCOPES from "../../data/demoTelescopes";
import { formatFocalRatio } from "../../utils/telescopeCalculations";

/** Build a lowercase haystack so "sky", "130", "dob" all match intuitively. */
function haystack(t) {
  return [
    t.brand,
    t.model,
    t.type,
    t.mount,
    `${t.aperture_mm}mm`,
    `${t.aperture_mm}`,
    `${t.focal_length_mm}mm`,
    formatFocalRatio(t.aperture_mm, t.focal_length_mm),
  ]
    .join(" ")
    .toLowerCase();
}

const INDEX = DEMO_TELESCOPES.map((t) => ({ t, hay: haystack(t) }));

/**
 * Instant, client-side telescope search. Every whitespace-separated token of
 * the query must appear in the entry — so "sky 130" narrows further. Selecting
 * a result hands the full telescope object to the parent to fill the form.
 *
 * @param {{ onSelect: (telescope:object) => void, selectedId?: string }} props
 */
export default function TelescopeSearch({ onSelect, selectedId }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return DEMO_TELESCOPES;
    return INDEX.filter(({ hay }) => tokens.every((tok) => hay.includes(tok))).map(
      ({ t }) => t,
    );
  }, [query]);

  return (
    <div className="flex min-h-0 flex-col">
      {/* Search box */}
      <div className="relative">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-ink-3" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search telescope model..."
          className="w-full border border-line bg-surface-2 py-2.5 pl-10 pr-9 text-sm text-ink placeholder:text-ink-3 transition-colors focus:border-accent focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
            aria-label="Clear search"
          >
            <FiX className="text-sm" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="no-scrollbar mt-3 max-h-64 min-h-0 space-y-1.5 overflow-y-auto pr-1">
        {results.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-3">
            No telescopes match “{query}”. Add a custom one below.
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {results.map((t) => {
              const active = t.id === selectedId;
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => onSelect(t)}
                  className={`flex w-full items-center gap-3 border px-3 py-2 text-left transition-colors ${
                    active
                      ? "border-accent/40 bg-accent/10"
                      : "border-line bg-surface-3 hover:border-accent hover:bg-surface-3"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-line bg-surface-2 text-accent">
                    <TbTelescope className="text-sm" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {t.brand} {t.model}
                    </span>
                    <span className="block truncate text-[11px] text-ink-3">
                      {t.type} · {t.aperture_mm} mm ·{" "}
                      {formatFocalRatio(t.aperture_mm, t.focal_length_mm)}
                    </span>
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
