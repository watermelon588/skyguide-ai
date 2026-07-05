import { computeDerived } from "../../utils/telescopeCalculations";

/** One derived-value pill. `soon` renders a muted "Coming Soon" placeholder. */
function SpecPill({ label, value, soon }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-[#6B7280]">
        {label}
      </p>
      {soon ? (
        <p className="mt-0.5 text-[11px] font-medium text-[#4B5563]">
          Coming Soon
        </p>
      ) : (
        <p className="mt-0.5 text-sm font-semibold text-white">
          {value ?? "—"}
        </p>
      )}
    </div>
  );
}

/**
 * Derived optics for a telescope draft. All values are computed (never entered)
 * and update live as aperture / focal length change. FOV + Recommended Targets
 * are intentionally "Coming Soon" — they need an eyepiece + the Astro Engine.
 *
 * @param {{ telescope: object }} props
 */
export default function TelescopeSpecs({ telescope }) {
  const { focalRatioLabel, maxMagnification, limitingMagnitude } =
    computeDerived(telescope);

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
        Derived Specifications
      </p>
      <div className="grid grid-cols-2 gap-2">
        <SpecPill label="F Ratio" value={focalRatioLabel} />
        <SpecPill
          label="Optical Power"
          value={maxMagnification ? `${maxMagnification}×` : "—"}
        />
        <SpecPill
          label="Limiting Mag (est.)"
          value={limitingMagnitude != null ? `${limitingMagnitude}` : "—"}
        />
        <SpecPill label="Field of View" soon />
        <SpecPill label="Recommended Targets" soon />
      </div>
    </div>
  );
}
