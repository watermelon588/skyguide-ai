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
    <div className="relative min-h-screen bg-[#05070A] text-white">
      <Starfield />
      <nav className="relative z-20 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Link
          to="/tonight"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-[#AAB4C5] backdrop-blur-3xl transition-colors hover:bg-white/10 hover:text-white"
        >
          ← Tonight's sky
        </Link>
        <Link
          to="/dashboard"
          className="text-sm font-semibold tracking-wide text-white/80 transition-colors hover:text-white"
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
      <p className="mt-2 max-w-sm text-sm text-[#AAB4C5]">{body}</p>
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
              className="mt-5 rounded-xl bg-[#FF8C1A] px-6 py-2.5 text-sm font-semibold text-[#090B10] transition-colors hover:bg-[#FF6B00]"
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
        <div className="h-72 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
        <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
        <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
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
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#FF8C1A]">
            The object
          </p>
          {target.description ? (
            <p className="mt-3 leading-relaxed text-[#AAB4C5]">
              {target.description}
            </p>
          ) : (
            <p className="mt-3 text-sm text-[#6B7280]">
              No description in the catalog yet.
            </p>
          )}
          {target.tips?.length > 0 && (
            <>
              <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.3em] text-[#6B7280]">
                Observation tips
              </p>
              <ul className="mt-3 space-y-2">
                {target.tips.map((tip) => (
                  <li
                    key={tip}
                    className="border-l-2 border-[#FF8C1A]/40 pl-3 text-sm leading-relaxed text-[#AAB4C5]"
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
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#FF8C1A]">
            Data sheet
          </p>
          <dl className="mt-4 space-y-1.5">
            {facts.map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-1.5 text-sm"
              >
                <dt className="text-[#6B7280]">{label}</dt>
                <dd className="text-right font-medium tabular-nums text-white">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </SpotlightCard>
      </div>

      <p className="text-center text-xs text-[#6B7280]">
        Coming to this panel: AI analysis, why-observe-tonight, and your
        observation history with this object.
      </p>
    </Shell>
  );
}
