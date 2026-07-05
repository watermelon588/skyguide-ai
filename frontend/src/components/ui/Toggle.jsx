import { motion } from "framer-motion";

const SPRING = { type: "spring", stiffness: 500, damping: 34 };

/**
 * Accessible on/off switch matching the SkyGuide design system.
 * Orange track when on, glass track when off; the knob springs across.
 *
 * @param {{
 *   checked: boolean,
 *   onChange: (next:boolean) => void,
 *   label?: string,
 *   hint?: string,
 *   disabled?: boolean,
 * }} props
 */
export default function Toggle({ checked, onChange, label, hint, disabled }) {
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "border-orange-400/40 bg-orange-500/90"
          : "border-white/10 bg-white/10"
      }`}
    >
      <motion.span
        layout
        transition={SPRING}
        className="ml-0.5 h-5 w-5 rounded-full bg-white shadow"
        style={{ marginLeft: checked ? "1.375rem" : "0.125rem" }}
      />
    </button>
  );

  if (!label) return button;

  return (
    <label className="flex items-center justify-between gap-3">
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-medium text-white">{label}</span>
        {hint && <span className="text-[11px] text-[#6B7280]">{hint}</span>}
      </span>
      {button}
    </label>
  );
}
