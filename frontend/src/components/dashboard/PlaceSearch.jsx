import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiLoader, FiMapPin } from "react-icons/fi";

import { searchLocations } from "../../services/user.service";

/**
 * Type-ahead place picker for the observer location.
 *
 * The manual-entry escape hatch used to be "type your latitude and longitude",
 * which asks the user to know something they almost never know. This asks for
 * the thing they DO know — the name of where they are — and resolves the
 * coordinates for them.
 *
 * Debounced at 350ms and aborting in-flight requests, because Nominatim's usage
 * policy is ~1 req/sec and a keystroke-per-request would blow through it.
 * Resolution stays server-side (GET /users/location/search).
 *
 * @param {(place: {label, city, state, country, latitude, longitude}) => void} onSelect
 */
const DEBOUNCE_MS = 350;
const MIN_QUERY = 2;

export default function PlaceSearch({ onSelect, autoFocus = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | searching | done | error
  const [open, setOpen] = useState(false);

  const boxRef = useRef(null);
  const abortRef = useRef(null);
  // Choosing a result writes that result's label into the input, which would
  // otherwise re-trigger the debounced search and pop the list open again on
  // top of the selection the user just made. This is the query to ignore.
  const skipQueryRef = useRef(null);

  // Clearing a too-short query is a direct consequence of typing, so it lives
  // in the handler — doing it in the effect would setState on every render pass
  // and cascade.
  const changeQuery = (e) => {
    const next = e.target.value;
    skipQueryRef.current = null; // real typing always searches
    setQuery(next);
    if (next.trim().length < MIN_QUERY) {
      abortRef.current?.abort();
      setResults([]);
      setStatus("idle");
      setOpen(false);
    }
  };

  // Debounced search. The abort controller means a superseded keystroke can
  // never land after the newer one and repaint stale results.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) return undefined;
    if (q === skipQueryRef.current) return undefined;

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("searching");
      try {
        const found = await searchLocations(q, controller.signal);
        setResults(found);
        setStatus("done");
        setOpen(true);
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        setResults([]);
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // Drop the request if the picker unmounts mid-flight.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (place) => {
    const label = shortLabel(place);
    abortRef.current?.abort();
    skipQueryRef.current = label;
    onSelect(place);
    setQuery(label);
    setOpen(false);
  };

  return (
    <div className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-2">
        Search for a place
      </span>

      <div ref={boxRef} className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-3">
          {status === "searching" ? (
            <FiLoader className="animate-spin" />
          ) : (
            <FiSearch />
          )}
        </span>
        <input
          type="text"
          autoFocus={autoFocus}
          value={query}
          onChange={changeQuery}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="City, town or dark-sky site…"
          aria-label="Search for a place by name"
          autoComplete="off"
          className="w-full border border-line bg-surface-2 py-2.5 pl-10 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent"
        />

        <AnimatePresence>
          {open && results.length > 0 && (
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto border border-line bg-surface-2 p-1"
            >
              {results.map((place, i) => (
                <li key={`${place.latitude},${place.longitude},${i}`}>
                  <button
                    type="button"
                    onClick={() => choose(place)}
                    className="flex w-full items-start gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-surface-3"
                  >
                    <FiMapPin className="mt-0.5 shrink-0 text-sm text-accent" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">
                        {shortLabel(place)}
                      </span>
                      <span className="block truncate text-[11px] text-ink-3">
                        {place.label}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {status === "done" && results.length === 0 && query.trim().length >= MIN_QUERY && (
        <span className="mt-1 block text-xs text-ink-3">
          No places matched “{query.trim()}”. Try a nearby town, or enter
          coordinates below.
        </span>
      )}
      {status === "error" && (
        <span className="mt-1 block text-xs text-danger">
          Place search is unavailable right now — enter coordinates below
          instead.
        </span>
      )}
    </div>
  );
}

/** "Leh, Ladakh, India" — the useful part of Nominatim's long display_name. */
function shortLabel(place) {
  const parts = [place.city, place.state, place.country].filter(Boolean);
  return parts.length ? parts.join(", ") : place.label;
}
