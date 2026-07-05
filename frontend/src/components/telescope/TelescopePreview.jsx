import { TbTelescope } from "react-icons/tb";
import { FiCheck, FiX } from "react-icons/fi";
import TelescopeTypeBadge from "./TelescopeTypeBadge";
import TelescopeSpecs from "./TelescopeSpecs";
import { formatFocalRatio } from "../../utils/telescopeCalculations";

/** A single optical stat (aperture / focal length / f-ratio). */
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

/** Capability chip: green tick when on, muted cross when off. */
function Capability({ label, on }) {
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

/**
 * Live telescope summary — updates on every field change. Reused as the modal's
 * right column and could stand alone anywhere a preview is needed.
 *
 * @param {{ telescope: object }} props
 */
export default function TelescopePreview({ telescope }) {
  const { brand, model, nickname, type, aperture_mm, focal_length_mm, mount } =
    telescope;

  const title =
    nickname?.trim() ||
    [brand, model].filter(Boolean).join(" ").trim() ||
    "New Telescope";

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl backdrop-blur-xl">
      {/* Identity */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/15">
          <TbTelescope className="text-xl text-orange-400" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-white">{title}</p>
          {nickname?.trim() && (brand || model) && (
            <p className="truncate text-xs text-[#6B7280]">
              {[brand, model].filter(Boolean).join(" ")}
            </p>
          )}
        </div>
      </div>

      {type && <TelescopeTypeBadge type={type} />}

      {/* Optics */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
        <Stat label="Aperture" value={aperture_mm ? `${aperture_mm} mm` : "—"} />
        <Stat
          label="Focal Length"
          value={focal_length_mm ? `${focal_length_mm} mm` : "—"}
        />
        <Stat
          label="F Ratio"
          value={formatFocalRatio(aperture_mm, focal_length_mm)}
        />
        <Stat label="Mount" value={mount || "—"} />
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-2">
        <Capability label="Tracking" on={!!telescope.tracking} />
        <Capability label="GoTo" on={!!telescope.goto} />
        <Capability label="Camera" on={!!telescope.cameraSupport} />
      </div>

      <div className="h-px w-full bg-white/10" />

      <TelescopeSpecs telescope={telescope} />
    </div>
  );
}
