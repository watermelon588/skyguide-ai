import { Link, useParams } from "react-router-dom";

import Starfield from "../components/tonight/Starfield";
import SpotlightCard from "../components/tonight/fx/SpotlightCard";
import TargetHero from "../components/target/TargetHero";
import VisibilityStrip from "../components/target/VisibilityStrip";
import { useTargetDetail } from "../hooks/useTargetDetail";
import {
  formatDec,
  formatDistance,
  formatMagnitude,
  formatRA,
} from "../components/tonight/vocabulary";

/**
 * /tonight/:id — the Detailed Target Panel. One page that owns everything
 * the platform knows about a single object, plus the two actions that
 * matter: plan it, observe it. Every click on an object anywhere in the app
 * lands here. Reserved for later phases: AI analysis, observation history.
 */

function Shell({ children }) {
  return (
    <div className="relative min-h-screen bg-bg text-ink">
      <Starfield />
      <nav className="relative z-20 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Link
          to="/tonight"
          className="border border-line bg-surface-2 px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          ← Tonight's sky
        </Link>
        <Link
          to="/dashboard"
          className="text-sm font-semibold tracking-wide text-ink-2 transition-colors hover:text-ink"
        >
          Dashboard
        </Link>
      </nav>
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 pb-24">
        {children}
      </main>
    </div>
  );
}

function Centered({ title, body, cta }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-2">{body}</p>
      {cta}
    </div>
  );
}

export default function TargetPanel() {
  const { id } = useParams();
  const { target, isLoading, isError, notFound, located } = useTargetDetail(id);

  if (!located) {
    return (
      <Shell>
        <Centered
          title="Set your observing location first"
          body="This dossier is computed for your exact coordinates."
          cta={
            <Link
              to="/dashboard"
              className="mt-5 bg-accent px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hi"
            >
              Go to dashboard
            </Link>
          }
        />
      </Shell>
    );
  }

  if (isLoading || (!target && !notFound && !isError)) {
    return (
      <Shell>
        <div className="h-72 animate-pulse border border-line bg-surface-2" />
        <div className="h-32 animate-pulse border border-line bg-surface-2" />
        <div className="h-48 animate-pulse border border-line bg-surface-2" />
      </Shell>
    );
  }

  if (isError || notFound) {
    return (
      <Shell>
        <Centered
          title={notFound ? `No object called “${id}”` : "The sky didn't answer"}
          body={
            notFound
              ? "That id isn't in the catalog — try the ledger on the Tonight page."
              : "Couldn't reach the Astro Engine. Check that it's running, then reload."
          }
        />
      </Shell>
    );
  }

  const facts = [
    ["Magnitude", formatMagnitude(target.magnitude)],
    [
      "Apparent size",
      target.angular_size_arcmin != null
        ? `${target.angular_size_arcmin.toFixed(1)}′`
        : "—",
    ],
    ["Distance", formatDistance(target.distance_ly)],
    ["RA (J2000)", formatRA(target.ra_deg)],
    ["Dec (J2000)", formatDec(target.dec_deg)],
    ["Difficulty", target.difficulty || "—"],
    ["Best season", target.season || "—"],
    ["Catalog", target.catalog || "—"],
  ];

  return (
    <Shell>
      <TargetHero target={target} />
      <VisibilityStrip target={target} />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* Story: description + tips */}
        <SpotlightCard className="p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
            The object
          </p>
          {target.description ? (
            <p className="mt-3 leading-relaxed text-ink-2">
              {target.description}
            </p>
          ) : (
            <p className="mt-3 text-sm text-ink-3">
              No description in the catalog yet.
            </p>
          )}
          {target.tips?.length > 0 && (
            <>
              <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.3em] text-ink-3">
                Observation tips
              </p>
              <ul className="mt-3 space-y-2">
                {target.tips.map((tip) => (
                  <li
                    key={tip}
                    className="border-l-2 border-accent/40 pl-3 text-sm leading-relaxed text-ink-2"
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            </>
          )}
        </SpotlightCard>

        {/* Data sheet */}
        <SpotlightCard className="p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
            Data sheet
          </p>
          <dl className="mt-4 space-y-1.5">
            {facts.map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-4 border-b border-line pb-1.5 text-sm"
              >
                <dt className="text-ink-3">{label}</dt>
                <dd className="text-right font-medium tabular-nums text-ink">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </SpotlightCard>
      </div>

      <p className="text-center text-xs text-ink-3">
        Coming to this panel: AI analysis, why-observe-tonight, and your
        observation history with this object.
      </p>
    </Shell>
  );
}
