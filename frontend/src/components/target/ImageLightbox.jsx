import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * A full-size image viewer. The target panel's hero is framed to a fixed band;
 * this lets the observer actually SEE the object — the DSS/Wikipedia image at
 * its natural size, on a black field, without leaving the page.
 *
 * Rendered in a portal so it escapes any clipping/transform ancestor (the same
 * trap the alignment overlay hit). Closes on backdrop click, the X, or Escape.
 */
export default function ImageLightbox({ src, alt, credit, open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    // Don't let the page scroll behind the viewer.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 p-4 sm:p-10"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center border border-line bg-surface-2 text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <X size={18} />
          </button>

          <motion.figure
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.96 }}
            transition={{ duration: 0.2 }}
            // Stop a click on the image itself from closing.
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-full max-w-full flex-col items-center"
          >
            <img
              src={src}
              alt={alt}
              className="max-h-[85vh] max-w-full border border-line object-contain"
            />
            {credit && (
              <figcaption className="mt-2 text-center text-xs text-ink-3">
                {credit}
              </figcaption>
            )}
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
