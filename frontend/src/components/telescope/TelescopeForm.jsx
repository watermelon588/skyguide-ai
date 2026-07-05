import Dropdown from "../ui/Dropdown";
import Toggle from "../ui/Toggle";
import { TELESCOPE_TYPES, MOUNT_TYPES } from "../../data/demoTelescopes";

/** Labelled text/number input styled for the dark glass theme. */
function Field({ label, value, onChange, type = "text", placeholder, unit }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
        {label}
      </span>
      <div className="relative">
        <input
          type={type}
          inputMode={type === "number" ? "decimal" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[#6B7280] transition-colors focus:border-orange-500 focus:outline-none"
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7280]">
            {unit}
          </span>
        )}
      </div>
    </label>
  );
}

/**
 * Custom telescope form. Fully controlled — every change is pushed up via
 * `onChange(patch)` so the live preview and derived specs update instantly.
 *
 * @param {{ draft: object, onChange: (patch:object) => void }} props
 */
export default function TelescopeForm({ draft, onChange }) {
  const set = (key) => (value) => onChange({ [key]: value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Brand" value={draft.brand} onChange={set("brand")} placeholder="Sky-Watcher" />
        <Field label="Model" value={draft.model} onChange={set("model")} placeholder="Explorer 130P" />
      </div>

      <Field
        label="Nickname (optional)"
        value={draft.nickname}
        onChange={set("nickname")}
        placeholder="My backyard scope"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Dropdown label="Type" value={draft.type} options={TELESCOPE_TYPES} onChange={set("type")} />
        <Dropdown label="Mount" value={draft.mount} options={MOUNT_TYPES} onChange={set("mount")} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Aperture" type="number" value={draft.aperture_mm} onChange={set("aperture_mm")} placeholder="130" unit="mm" />
        <Field label="Focal Length" type="number" value={draft.focal_length_mm} onChange={set("focal_length_mm")} placeholder="650" unit="mm" />
      </div>

      {/* Capabilities */}
      <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
        <Toggle label="Tracking" hint="Motorised object tracking" checked={!!draft.tracking} onChange={set("tracking")} />
        <Toggle label="GoTo" hint="Computerised object finding" checked={!!draft.goto} onChange={set("goto")} />
        <Toggle label="Camera Support" hint="Prime-focus astrophotography" checked={!!draft.cameraSupport} onChange={set("cameraSupport")} />
      </div>

      <Field label="Weight (optional)" type="number" value={draft.weight_kg} onChange={set("weight_kg")} placeholder="6.6" unit="kg" />

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
          Notes (optional)
        </span>
        <textarea
          rows={2}
          value={draft.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Eyepieces, quirks, collimation notes…"
          className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[#6B7280] transition-colors focus:border-orange-500 focus:outline-none"
        />
      </label>
    </div>
  );
}
