import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, TriangleAlert, X } from "lucide-react";

/**
 * One toast system for the whole app — the single place transient feedback
 * lives, replacing the scattered inline "Saved!" banners on the planner,
 * profile and notifications.
 *
 * Design-system native: flat surface, hairline border, radius 0, a coloured
 * left edge for kind (accent / success / danger), no glass. Auto-dismisses;
 * dismissible; stacked bottom-right on desktop, full-width bottom on mobile.
 * Rendered through a portal so no page's overflow clipping can hide it.
 *
 * Usage:  const toast = useToast();  toast.success("Added to plan");
 */

const ToastContext = createContext(null);

const KIND_META = {
  success: { icon: Check, edge: "border-l-success", tint: "text-success" },
  error: { icon: TriangleAlert, edge: "border-l-danger", tint: "text-danger" },
  info: { icon: Info, edge: "border-l-accent", tint: "text-accent" },
};

const DEFAULT_TTL = 4000;

// Monotonic id source. Module scope (not a ref) so it never participates in
// render and each toast is unique for the session.
let toastSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, { kind = "info", ttl = DEFAULT_TTL } = {}) => {
      if (!message) return undefined;
      const id = ++toastSeq;
      setToasts((list) => [...list, { id, message, kind }]);
      if (ttl > 0) setTimeout(() => dismiss(id), ttl);
      return id;
    },
    [dismiss],
  );

  // `toast(msg)` plus `toast.success/error/info(msg)` — the ergonomic surface.
  // Object.assign builds it in one expression (no post-hoc property mutation).
  const toast = useMemo(
    () =>
      Object.assign((message, opts) => push(message, opts), {
        success: (m, o) => push(m, { ...o, kind: "success" }),
        error: (m, o) => push(m, { ...o, kind: "error" }),
        info: (m, o) => push(m, { ...o, kind: "info" }),
        dismiss,
      }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1000] flex flex-col items-stretch gap-2 p-4 sm:inset-x-auto sm:right-4 sm:w-80">
          <AnimatePresence initial={false}>
            {toasts.map((t) => {
              const meta = KIND_META[t.kind] ?? KIND_META.info;
              const Icon = meta.icon;
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className={`pointer-events-auto flex items-start gap-3 border border-line ${meta.edge} border-l-2 bg-surface-2 px-4 py-3 shadow-lg`}
                  role="status"
                >
                  <Icon size={16} className={`mt-0.5 shrink-0 ${meta.tint}`} />
                  <p className="min-w-0 flex-1 text-sm leading-snug text-ink">
                    {t.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss"
                    className="shrink-0 text-ink-3 transition-colors hover:text-ink"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

/** Access the toast function. Safe no-op if a provider isn't mounted. */
export function useToast() {
  const toast = useContext(ToastContext);
  return toast ?? Object.assign(() => {}, {
    success: () => {},
    error: () => {},
    info: () => {},
    dismiss: () => {},
  });
}
