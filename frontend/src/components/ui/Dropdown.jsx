import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiCheck } from "react-icons/fi";

/**
 * Dark, glassmorphic select. Native <select> renders light OS menus that break
 * the theme, so this is a custom floating dropdown with click-outside + Escape.
 *
 * @param {{
 *   value: string,
 *   options: string[],
 *   onChange: (value:string) => void,
 *   label?: string,
 *   placeholder?: string,
 * }} props
 */
export default function Dropdown({
  value,
  options,
  onChange,
  label,
  placeholder = "Select...",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
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

  const select = (option) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
          {label}
        </span>
      )}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 border border-line bg-surface-2 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-3 focus:border-accent focus:outline-none"
        >
          <span className={value ? "text-ink" : "text-ink-3"}>
            {value || placeholder}
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-ink-3"
          >
            <FiChevronDown className="text-base" />
          </motion.span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="no-scrollbar absolute z-50 mt-1.5 max-h-56 w-full overflow-y-auto border border-line bg-surface-2 p-1"
            >
              {options.map((option) => {
                const active = option === value;
                return (
                  <li key={option}>
                    <button
                      type="button"
                      onClick={() => select(option)}
                      className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-sm transition-colors ${
                        active
                          ? "bg-accent/15 text-accent"
                          : "text-ink-2 hover:bg-surface-3 hover:text-ink"
                      }`}
                    >
                      {option}
                      {active && <FiCheck className="text-sm" />}
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
