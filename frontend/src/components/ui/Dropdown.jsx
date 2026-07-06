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
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
          {label}
        </span>
      )}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/10 focus:border-orange-500 focus:outline-none"
        >
          <span className={value ? "text-white" : "text-[#6B7280]"}>
            {value || placeholder}
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[#6B7280]"
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
              className="no-scrollbar absolute z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-lg border border-white/10 bg-[#12141C]/95 p-1 shadow-2xl backdrop-blur-xl"
            >
              {options.map((option) => {
                const active = option === value;
                return (
                  <li key={option}>
                    <button
                      type="button"
                      onClick={() => select(option)}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                        active
                          ? "bg-orange-500/15 text-orange-300"
                          : "text-[#AAB4C5] hover:bg-white/5 hover:text-white"
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
