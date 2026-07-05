import { useState } from "react";
import { motion } from "framer-motion";
import { FiSettings, FiPlus, FiCheck, FiX } from "react-icons/fi";
import { TbTelescope } from "react-icons/tb";
import { useTelescope } from "../../hooks/useTelescope";
import { formatFocalRatio } from "../../utils/telescopeCalculations";
import TelescopeTypeBadge from "../telescope/TelescopeTypeBadge";
import TelescopeModal from "../telescope/TelescopeModal";
import Button from "../ui/Button";

/** Inline stat (label + value) for the compact status bar. */
function Stat({ label, value }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wide text-[#6B7280]">
        {label}
      </span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

/** Compact capability chip (Tracking / GoTo) for the dashboard row. */
function Chip({ label, on }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        on
          ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]"
          : "border-white/10 bg-white/5 text-[#6B7280]"
      }`}
    >
      {on ? <FiCheck className="text-xs" /> : <FiX className="text-xs" />}
      {label}
    </span>
  );
}

const CARD_CLASS =
  "flex w-full flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 shadow-2xl backdrop-blur-3xl transition-all";

/**
 * Telescope configuration dashboard slot.
 *
 * Compact horizontal card (like Observer Location) when a telescope is saved;
 * an inviting empty state otherwise. Owns the configuration modal. All
 * persistence goes through useTelescope → telescope.storage (LocalStorage for
 * now), so Session 11 can swap in the REST service with no change here.
 */
export default function TelescopeCard() {
  const { telescope, hasTelescope, saveTelescope, deleteTelescope } =
    useTelescope();
  const [open, setOpen] = useState(false);

  const handleSave = (record) => {
    saveTelescope(record);
    setOpen(false);
  };

  const handleDelete = () => {
    deleteTelescope();
    setOpen(false);
  };

  const title =
    telescope?.nickname?.trim() ||
    [telescope?.brand, telescope?.model].filter(Boolean).join(" ");

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={CARD_CLASS}
      >
        {hasTelescope ? (
          <>
            {/* Identity */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/15">
                <TbTelescope className="text-lg text-orange-400" />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-bold text-white">{title}</p>
                <p className="truncate text-xs text-[#AAB4C5]">
                  {telescope.nickname?.trim()
                    ? [telescope.brand, telescope.model].filter(Boolean).join(" ")
                    : "Telescope configured"}
                </p>
              </div>
              <TelescopeTypeBadge type={telescope.type} className="shrink-0" />
            </div>

            {/* Optics */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Stat label="Aperture" value={`${telescope.aperture_mm} mm`} />
              <Stat label="Focal" value={`${telescope.focal_length_mm} mm`} />
              <Stat
                label="F Ratio"
                value={formatFocalRatio(
                  telescope.aperture_mm,
                  telescope.focal_length_mm,
                )}
              />
              <Stat label="Mount" value={telescope.mount} />
            </div>

            {/* Capabilities */}
            <div className="flex flex-wrap items-center gap-2">
              <Chip label="Tracking" on={!!telescope.tracking} />
              <Chip label="GoTo" on={!!telescope.goto} />
            </div>

            <div className="ml-auto">
              <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
                <FiSettings className="text-base" />
                <span className="hidden sm:inline">Configure</span>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <TbTelescope className="text-lg text-[#6B7280]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">No telescope configured</p>
                <p className="truncate text-xs text-[#AAB4C5]">
                  Configure your telescope to receive personalized observation
                  recommendations.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setOpen(true)}
              className="ml-auto shrink-0"
            >
              <FiPlus className="text-base" />
              Add Telescope
            </Button>
          </>
        )}
      </motion.section>

      <TelescopeModal
        open={open}
        initial={telescope}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  );
}
