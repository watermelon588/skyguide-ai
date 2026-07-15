import { motion } from "framer-motion";
import ConnectionIndicator from "../alignment/ConnectionIndicator";

/**
 * Shared shell for the alignment workspace's telemetry panels.
 *
 * The dashboard's DashboardCard is tuned for full-width rows; the workspace
 * stacks narrow panels in a column, so it gets its own (smaller) shell rather
 * than bending that one. Flat surface + hairline, radius 0, per the design
 * system — depth comes from the surface tier, never from blur.
 */
export function Panel({ icon, title, indicator, actions, children, className = "" }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`border border-line bg-surface-2 ${className}`}
    >
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        {icon && <span className="shrink-0 text-accent">{icon}</span>}
        <h2 className="min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-[0.2em] text-ink-3">
          {title}
        </h2>
        {indicator && (
          <ConnectionIndicator tone={indicator.tone} label={indicator.label} />
        )}
        {actions}
      </header>
      <div className="px-4 py-4">{children}</div>
    </motion.section>
  );
}

/** Label over value, the workspace's atom of telemetry. */
export function Field({ label, value, valueClass = "", mono = true }) {
  return (
    <div className="min-w-0 border border-line bg-surface-3 px-3 py-2">
      <p className="truncate text-[10px] uppercase tracking-wide text-ink-3">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate text-xs ${mono ? "font-mono" : ""} ${
          valueClass || "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/** The oversized readouts — heading/pitch/roll, angular error. */
export function BigField({ label, value, valueClass = "" }) {
  return (
    <div className="min-w-0 border border-line bg-surface-3 px-3 py-2.5 text-center">
      <p className="truncate text-[10px] uppercase tracking-wide text-ink-3">
        {label}
      </p>
      <p
        className={`mt-1 truncate font-mono text-lg font-bold ${
          valueClass || "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
