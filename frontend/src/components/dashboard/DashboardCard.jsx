import { cn } from "@/lib/utils";

/**
 * Shared dashboard-card layout primitives.
 *
 * Observer Location, Telescope, and Sync Telescope are all the same horizontal
 * flat bar: identity on the left, content in the middle, right-aligned action.
 * Centralising the shell / row / identity here keeps their height, spacing,
 * typography, and vertical rhythm identical — only the content differs.
 */

/** Visual container: flat solid surface + hairline border + compact padding. */
export const DASHBOARD_CARD_SHELL =
  "w-full border border-line bg-surface-2 px-5 py-3 transition-colors";

/** Horizontal, wrap-friendly, vertically-centered content row. */
export const DASHBOARD_CARD_ROW =
  "flex w-full flex-wrap items-center gap-x-6 gap-y-4";

/** Shell + row combined — for cards whose section IS a single row. */
export const DASHBOARD_CARD_CLASS = `${DASHBOARD_CARD_SHELL} flex flex-wrap items-center gap-x-6 gap-y-4`;

/** Shared entrance animation so every card appears with the same motion. */
export const DASHBOARD_CARD_MOTION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const DEFAULT_ICON_TONE = "border-accent/30 bg-accent/15";

/**
 * Left identity block: 40px icon tile + title + subtitle, with an optional
 * trailing node (status badge). Fixed typography (title text-sm/bold,
 * subtitle text-xs/muted) is the single source of truth for all three cards.
 *
 * @param {{
 *   icon: React.ReactNode,          // glyph element (caller sets size + color)
 *   iconClassName?: string,         // icon tile border/bg tone
 *   title: React.ReactNode,
 *   subtitle?: React.ReactNode,     // string (truncated) or node
 *   trailing?: React.ReactNode,
 *   className?: string,             // extra root classes (e.g. "flex-1")
 * }} props
 */
export function CardIdentity({
  icon,
  iconClassName = DEFAULT_ICON_TONE,
  title,
  subtitle,
  trailing,
  className,
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
          iconClassName,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-bold text-ink">{title}</p>
        {subtitle != null &&
          (typeof subtitle === "string" ? (
            <p className="truncate text-xs text-ink-2">{subtitle}</p>
          ) : (
            <div className="text-xs text-ink-2">{subtitle}</div>
          ))}
      </div>
      {trailing}
    </div>
  );
}
