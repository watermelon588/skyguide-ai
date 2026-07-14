/**
 * The 25 / 50 / 100 km radius chips. Controlled — the page owns the value and
 * re-queries on change. Flat, radius-0, blue-active to match the design system.
 */

const OPTIONS = [25, 50, 100];

export default function RadiusSelector({ value, onChange, disabled = false }) {
  return (
    <div className="inline-flex border border-line bg-surface-2">
      {OPTIONS.map((km) => {
        const active = km === value;
        return (
          <button
            key={km}
            type="button"
            disabled={disabled}
            onClick={() => onChange(km)}
            className={`px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
              active
                ? "bg-accent text-ink"
                : "text-ink-2 hover:bg-surface-3 hover:text-ink"
            }`}
          >
            {km} km
          </button>
        );
      })}
    </div>
  );
}
