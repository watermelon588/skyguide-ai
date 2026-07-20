import { Link } from "react-router-dom";

import SpotlightCard from "../tonight/fx/SpotlightCard";
import { useRecommendations } from "../../hooks/useRecommendations";
import { useTelescope } from "../../hooks/useTelescope";
import { useObservations } from "../../hooks/useObservations";

/**
 * The Target Panel's intelligence rail — the three sections the placeholder
 * card used to promise, now real:
 *
 *   1. Why tonight    — the recommendation engine's per-object reasons + rank
 *                       (React Query dedupes the fetch against VisibilityStrip).
 *   2. For your setup — deterministic optics: the user's saved telescope vs
 *                       this object's magnitude and apparent size.
 *   3. Your history   — the user's logged entries for this catalog_id.
 *
 * Everything degrades honestly: no telescope → a nudge to add one; not in
 * tonight's picks → derived one-liner from live geometry; no history → say so.
 */

/** Visual limiting magnitude ≈ 7.5 + 5·log10(aperture in cm). */
function limitingMagnitude(apertureMm) {
  if (!apertureMm || apertureMm <= 0) return null;
  return 7.5 + 5 * Math.log10(apertureMm / 10);
}

function Section({ label, children }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
        {label}
      </p>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

function Bullet({ children }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-2">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-accent/60" />
      <span>{children}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// 1. Why tonight
// ---------------------------------------------------------------------------

function WhyTonight({ target }) {
  const recs = useRecommendations({ limit: 20 });
  const index = recs.objects.findIndex(
    (o) => o.catalog_id === target.catalog_id,
  );
  const match = index >= 0 ? recs.objects[index] : null;

  if (match?.reasons?.length) {
    return (
      <>
        <p className="text-sm text-ink-2">
          <span className="font-semibold text-ink">
            #{index + 1} of tonight's picks
          </span>{" "}
          for your sky and scope.
        </p>
        <ul className="mt-2.5 space-y-1.5">
          {match.reasons.map((reason) => (
            <Bullet key={reason}>{reason}</Bullet>
          ))}
        </ul>
      </>
    );
  }

  // Not among tonight's ranked picks — derive an honest line from geometry.
  if (!target.visible) {
    return (
      <p className="text-sm leading-relaxed text-ink-2">
        Below your horizon right now
        {target.season ? ` — its season is ${target.season}` : ""}. Not one for
        tonight.
      </p>
    );
  }
  return (
    <p className="text-sm leading-relaxed text-ink-2">
      Above your horizon
      {target.altitude_deg != null
        ? ` at ${Math.round(target.altitude_deg)}°`
        : ""}
      {target.moon_separation_deg != null
        ? `, ${Math.round(target.moon_separation_deg)}° from the Moon`
        : ""}
      , but not among tonight's top picks — the ranked list favors better-placed
      objects right now.
    </p>
  );
}

// ---------------------------------------------------------------------------
// 2. For your setup
// ---------------------------------------------------------------------------

function ForYourSetup({ target }) {
  const { telescope, hasTelescope, isLoading } = useTelescope();

  if (isLoading) {
    return <div className="h-16 animate-pulse bg-surface-3" />;
  }

  if (!hasTelescope) {
    return (
      <p className="text-sm leading-relaxed text-ink-2">
        Save your telescope on the{" "}
        <Link to="/dashboard" className="text-accent hover:text-accent-hi">
          dashboard
        </Link>{" "}
        and this section reads the object against your actual optics.
      </p>
    );
  }

  const limit = limitingMagnitude(telescope.aperture_mm);
  const mag = target.magnitude;
  const headroom = limit != null && mag != null ? limit - mag : null;

  const lines = [];
  if (headroom != null) {
    if (headroom >= 4) {
      lines.push(
        `Bright and easy for your ${telescope.aperture_mm} mm — ${headroom.toFixed(1)} magnitudes inside its ~${limit.toFixed(1)} limit.`,
      );
    } else if (headroom >= 1.5) {
      lines.push(
        `Comfortably within reach of your ${telescope.aperture_mm} mm (limit ≈ mag ${limit.toFixed(1)}).`,
      );
    } else if (headroom >= 0) {
      lines.push(
        `Near your ${telescope.aperture_mm} mm scope's limit (≈ mag ${limit.toFixed(1)}) — a challenge object; use averted vision.`,
      );
    } else {
      lines.push(
        `At mag ${mag.toFixed(1)} this sits beyond your ${telescope.aperture_mm} mm scope's ~${limit.toFixed(1)} visual limit — a target for photography or a bigger aperture.`,
      );
    }
  }
  if (target.angular_size_arcmin != null) {
    if (target.angular_size_arcmin >= 60) {
      lines.push(
        "Wider than a typical eyepiece field — sweep across it at your lowest magnification.",
      );
    } else if (target.angular_size_arcmin >= 15) {
      lines.push("Large enough to frame nicely at low power.");
    } else if (target.angular_size_arcmin < 2) {
      lines.push("Small — this one rewards high magnification on steady nights.");
    }
  }
  if (target.difficulty) {
    lines.push(`Catalog difficulty: ${target.difficulty}.`);
  }

  if (!lines.length) {
    return (
      <p className="text-sm leading-relaxed text-ink-2">
        Not enough catalog data to judge this one against your{" "}
        {telescope.aperture_mm} mm — point and find out.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {lines.map((line) => (
        <Bullet key={line}>{line}</Bullet>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// 3. Your history
// ---------------------------------------------------------------------------

const STATUS_STYLE = {
  planned: "border-accent/40 bg-accent/10 text-accent-hi",
  observed: "border-success/40 bg-success/10 text-success",
  skipped: "border-line bg-surface-3 text-ink-3",
};

function historyDate(entry) {
  const ts = entry.resolvedAt || entry.createdAt;
  if (!ts) return "";
  return new Date(ts).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function YourHistory({ target }) {
  const { observations, isLoading } = useObservations();

  if (isLoading) {
    return <div className="h-12 animate-pulse bg-surface-3" />;
  }

  const entries = observations.filter(
    (o) => o.catalog_id === target.catalog_id,
  );

  if (!entries.length) {
    return (
      <p className="text-sm leading-relaxed text-ink-2">
        You haven't logged this object yet. Plan it above and it starts its
        story here.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li key={entry._id} className="border border-line bg-surface-3 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span
              className={`border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] ${STATUS_STYLE[entry.status] ?? STATUS_STYLE.skipped}`}
            >
              {entry.status}
            </span>
            <span className="text-[11px] tabular-nums text-ink-3">
              {historyDate(entry)}
            </span>
          </div>
          {entry.notes && (
            <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
              {entry.notes}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------

export default function TargetIntel({ target }) {
  return (
    <SpotlightCard className="flex flex-col gap-6 p-5">
      <Section label="Why tonight">
        <WhyTonight target={target} />
      </Section>
      <Section label="For your setup">
        <ForYourSetup target={target} />
      </Section>
      <Section label="Your history">
        <YourHistory target={target} />
      </Section>
    </SpotlightCard>
  );
}
