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
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#AAB4C5] ${className}`}
    >
      <TbTelescope className="text-xs text-orange-400" />
      {type}
    </span>
  );
}
