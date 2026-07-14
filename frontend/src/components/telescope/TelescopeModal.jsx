import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiTrash2 } from "react-icons/fi";
import { TbTelescope } from "react-icons/tb";
import TelescopeSearch from "./TelescopeSearch";
import TelescopeForm from "./TelescopeForm";
import TelescopePreview from "./TelescopePreview";
import Button from "../ui/Button";

const BLANK = {
  id: null,
  sourceId: null,
  brand: "",
  model: "",
  nickname: "",
  type: "Reflector",
  aperture_mm: "",
  focal_length_mm: "",
  mount: "Alt-Az",
  tracking: false,
  goto: false,
  cameraSupport: false,
  weight_kg: "",
  notes: "",
};

const str = (v) => (v == null ? "" : String(v));

/** Merge a saved telescope into the editable (string-based) draft shape. */
function toDraft(initial) {
  if (!initial) return { ...BLANK };
  return {
    ...BLANK,
    ...initial,
    aperture_mm: str(initial.aperture_mm),
    focal_length_mm: str(initial.focal_length_mm),
    weight_kg: str(initial.weight_kg),
    sourceId: null,
  };
}

/**
 * Telescope configuration modal.
 *
 * Two columns on desktop: search + custom form (left), live preview (right).
 * All editing happens in a local `draft`; nothing persists until Save, which
 * hands a normalised record to the parent (numbers coerced, id preserved).
 *
 * @param {{
 *   open: boolean,
 *   initial: object|null,
 *   onClose: () => void,
 *   onSave: (telescope:object) => void,
 *   onDelete?: () => void,
 * }} props
 */
export default function TelescopeModal({ open, initial, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => toDraft(initial));

  // Re-seed the draft whenever the modal (re)opens.
  useEffect(() => {
    if (open) setDraft(toDraft(initial));
  }, [open, initial]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSelect = (t) =>
    setDraft((d) => ({
      ...BLANK,
      ...t,
      id: d.id,
      sourceId: t.id,
      aperture_mm: str(t.aperture_mm),
      focal_length_mm: str(t.focal_length_mm),
      weight_kg: str(t.weight_kg),
    }));

  // Manual edits clear the search highlight.
  const handleChange = (patch) =>
    setDraft((d) => ({ ...d, ...patch, sourceId: null }));

  const valid =
    draft.brand.trim() &&
    draft.model.trim() &&
    Number(draft.aperture_mm) > 0 &&
    Number(draft.focal_length_mm) > 0;

  const handleSave = () => {
    if (!valid) return;
    const { sourceId, ...rest } = draft;
    void sourceId;
    onSave({
      ...rest,
      brand: rest.brand.trim(),
      model: rest.model.trim(),
      nickname: rest.nickname.trim(),
      aperture_mm: Number(rest.aperture_mm),
      focal_length_mm: Number(rest.focal_length_mm),
      weight_kg: rest.weight_kg ? Number(rest.weight_kg) : null,
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden border border-line bg-surface-1"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-accent/30 bg-accent/15">
                    <TbTelescope className="text-lg text-accent" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-ink">
                      Configure Telescope
                    </h2>
                    <p className="text-xs text-ink-3">
                      Search a model or add your own
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                  <FiX className="text-lg" />
                </Button>
              </div>

              {/* Body */}
              <div className="no-scrollbar grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1fr_320px]">
                {/* Left: search + form */}
                <div className="min-w-0 space-y-5">
                  <section>
                    <h3 className="mb-2.5 text-sm font-semibold text-ink">
                      Search Telescope
                    </h3>
                    <TelescopeSearch onSelect={handleSelect} selectedId={draft.sourceId} />
                  </section>

                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-line" />
                    <span className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
                      or add custom
                    </span>
                    <span className="h-px flex-1 bg-line" />
                  </div>

                  <TelescopeForm draft={draft} onChange={handleChange} />
                </div>

                {/* Right: live preview */}
                <div className="lg:sticky lg:top-0">
                  <TelescopePreview telescope={draft} />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 border-t border-line px-6 py-4">
                {initial && onDelete && (
                  <Button variant="danger" onClick={onDelete}>
                    <FiTrash2 className="text-base" />
                    <span className="hidden sm:inline">Remove</span>
                  </Button>
                )}
                <div className="ml-auto flex gap-3">
                  <Button variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSave} disabled={!valid}>
                    Save Telescope
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
