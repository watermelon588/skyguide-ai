import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiCheck, FiCrosshair } from "react-icons/fi";

/**
 * Searchable IANA timezone dropdown.
 *
 * The old field was a free-text input validated against Intl — which meant the
 * user had to already know that "Asia/Kolkata" is spelled exactly that way, and
 * a typo was the only feedback. The full list comes straight from the runtime
 * (Intl.supportedValuesOf), so it can never drift from what Intl will accept.
 *
 * ~400 zones is too many to scroll, so the trigger doubles as a filter box.
 * The shared ui/Dropdown has no filtering, hence a local component rather than
 * bending that one for a single call site.
 */

/** Every zone the runtime knows, or a small fallback on older browsers. */
function allZones() {
  try {
    const zones = Intl.supportedValuesOf?.("timeZone");
    if (Array.isArray(zones) && zones.length) return zones;
  } catch {
    /* fall through */
  }
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return [local, "UTC"].filter(Boolean);
}

/** "+05:30" for a zone right now — the bit people actually recognise. */
function offsetLabel(zone) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

export default function TimezoneSelect({ value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useRef(null);

  const zones = useMemo(() => allZones(), []);

  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const pool = q
      ? zones.filter((z) => z.toLowerCase().includes(q))
      : zones;
    // Cap the rendered list: nobody scrolls 400 rows, and it keeps the popover
    // cheap to paint on every keystroke.
    return pool.slice(0, 60);
  }, [zones, filter]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (zone) => {
    onChange(zone);
    setFilter("");
    setOpen(false);
  };

  const detect = () => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (local) onChange(local);
  };

  return (
    <div className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-2">
        Timezone
      </span>

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 border bg-surface-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-3 focus:border-accent focus:outline-none"
          style={{ borderColor: error ? "#EF4444" : "#232427" }}
        >
          <span className={value ? "truncate text-ink" : "text-ink-3"}>
            {value || "Select a timezone…"}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {value && (
              <span className="font-mono text-[11px] text-ink-3">
                {offsetLabel(value)}
              </span>
            )}
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-ink-3"
            >
              <FiChevronDown className="text-base" />
            </motion.span>
          </span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="absolute z-50 mt-1.5 w-full border border-line bg-surface-2"
            >
              <input
                autoFocus
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter — kolkata, london, utc…"
                aria-label="Filter timezones"
                className="w-full border-b border-line bg-surface-1 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3"
              />
              <ul role="listbox" className="max-h-56 overflow-y-auto p-1">
                {matches.length === 0 ? (
                  <li className="px-2.5 py-2 text-xs text-ink-3">
                    No timezone matches “{filter.trim()}”.
                  </li>
                ) : (
                  matches.map((zone) => {
                    const active = zone === value;
                    return (
                      <li key={zone}>
                        <button
                          type="button"
                          onClick={() => select(zone)}
                          className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-sm transition-colors ${
                            active
                              ? "bg-accent/15 text-accent"
                              : "text-ink-2 hover:bg-surface-3 hover:text-ink"
                          }`}
                        >
                          <span className="truncate">{zone}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="font-mono text-[10px] text-ink-3">
                              {offsetLabel(zone)}
                            </span>
                            {active && <FiCheck className="text-sm" />}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : (
        <button
          type="button"
          onClick={detect}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:text-accent-hi"
        >
          <FiCrosshair className="text-sm" />
          Detect from browser
        </button>
      )}
    </div>
  );
}
