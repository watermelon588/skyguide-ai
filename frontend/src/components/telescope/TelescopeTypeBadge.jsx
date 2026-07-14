import { TbTelescope } from "react-icons/tb";

/**
 * Compact pill showing the telescope's optical type. Neutral glass styling —
 * no new palette, just a subtle icon + label that reads as metadata.
 *
 * @param {{ type: string, className?: string }} props
 */
export default function TelescopeTypeBadge({ type, className = "" }) {
  if (!type) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink-2 ${className}`}
    >
      <TbTelescope className="text-xs text-accent" />
      {type}
    </span>
  );
}
