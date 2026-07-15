/**
 * BentoGrid / BentoCard — the redesign's core layout primitive.
 *
 * A dense, modular grid of flat (radius-0) tiles separated by hairlines, no
 * glass. Tiles declare their own column/row span so layouts stay compact and
 * editorial. Presentational only.
 */

import { cn } from "../../lib/utils";

export function BentoGrid({ children, className = "", cols = 12 }) {
  return (
    <div
      className={cn("grid gap-px bg-line", className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

/**
 * BentoCard — a single tile. `span`/`rowSpan` map to Tailwind col-span/row-span
 * responsively via the className you pass (e.g. "col-span-12 md:col-span-6").
 * Defaults: solid surface, hairline hover-lift to accent, generous padding.
 */
export function BentoCard({
  children,
  className = "",
  as: Tag = "div",
  interactive = false,
  ...props
}) {
  return (
    <Tag
      className={cn(
        "relative bg-surface-2 p-6 sm:p-8",
        "transition-colors duration-300",
        interactive &&
          "group cursor-pointer hover:bg-surface-3 hover:outline hover:outline-1 hover:outline-accent",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export default BentoGrid;
