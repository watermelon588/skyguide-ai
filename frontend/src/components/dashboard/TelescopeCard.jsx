import { useState } from "react";
import { motion } from "framer-motion";
import { FiSettings, FiPlus, FiCheck, FiX } from "react-icons/fi";
import { TbTelescope } from "react-icons/tb";
import { useTelescope } from "../../hooks/useTelescope";
import { formatFocalRatio } from "../../utils/telescopeCalculations";
import TelescopeTypeBadge from "../telescope/TelescopeTypeBadge";
import TelescopeModal from "../telescope/TelescopeModal";
import Button from "../ui/Button";
import {
  DASHBOARD_CARD_CLASS,
  DASHBOARD_CARD_MOTION,
  CardIdentity,
} from "./DashboardCard";

/** Inline stat (label + value) for the compact status bar. */
function Stat({ label, value }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wide text-ink-3">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}

/** Compact capability chip (Tracking / GoTo) for the dashboard row. */
function Chip({ label, on }) {
  return (
    <span
      className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-medium ${
        on
          ? "border-success/30 bg-success/10 text-success"
          : "border-line bg-surface-3 text-ink-3"
      }`}
    >
      {on ? <FiCheck className="text-xs" /> : <FiX className="text-xs" />}
      {label}
    </span>
  );
}

/**
 * Telescope configuration dashboard slot.
 *
 * Compact horizontal card (like Observer Location) when a telescope is saved;
 * an inviting empty state otherwise. Owns the configuration modal. All
 * persistence goes through useTelescope → telescope.service (REST + React
 * Query); this card never touches storage directly.
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
      <motion.section {...DASHBOARD_CARD_MOTION} className={DASHBOARD_CARD_CLASS}>
        {hasTelescope ? (
          <>
            {/* Identity */}
            <CardIdentity
              icon={<TbTelescope className="text-lg text-accent" />}
              title={title}
              subtitle={
                telescope.nickname?.trim()
                  ? [telescope.brand, telescope.model].filter(Boolean).join(" ")
                  : "Telescope configured"
              }
              trailing={
                <TelescopeTypeBadge type={telescope.type} className="shrink-0" />
              }
            />

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
            <CardIdentity
              className="flex-1"
              icon={<TbTelescope className="text-lg text-ink-3" />}
              iconClassName="border-line bg-surface-3"
              title="No telescope configured"
              subtitle="Configure your telescope to receive personalized observation recommendations."
            />
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
