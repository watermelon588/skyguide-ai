import { useEffect, useState } from "react";
import { Satellite } from "lucide-react";

import SpotlightCard from "../tonight/fx/SpotlightCard";
import { compassPoint } from "../tonight/vocabulary";
import { useSatellitePasses } from "../../hooks/useSatellitePasses";

/**
 * ISS flyover card — the next pass in detail (rise → peak → set with
 * directions, peak altitude, duration) plus the rest of the 48 h window.
 * Within three hours of the next rise a live countdown chip takes over;
 * during the pass itself it flips to "overhead now".
 */

/** Minutes until an ISO instant; ticks with `now`. */
function minutesUntil(iso, now) {
  return (new Date(iso).getTime() - now) / 60000;
}

function countdownLabel(pass, now) {
  const toRise = minutesUntil(pass.rise.utc, now);
  const toSet = minutesUntil(pass.set.utc, now);
  if (toSet <= 0) return null; // pass is over — parent picks the next one
  if (toRise <= 0) return "Overhead now";
  if (toRise > 180) return null; // countdown earns attention only under 3 h
  const h = Math.floor(toRise / 60);
  const m = Math.round(toRise % 60);
  return `Overhead in ${h > 0 ? `${h} h ` : ""}${m} m`;
}

function PassPoint({ label, point }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#6B7280]">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-white">
        {point.local}
      </p>
      <p className="text-[11px] text-[#AAB4C5]">
        {compassPoint(point.azimuth_deg)} · {Math.round(point.altitude_deg)}°
      </p>
    </div>
  );
}

export default function IssPassCard() {
  const { isLoading, isError, satellite, passes } = useSatellitePasses();

  // One shared clock tick (30 s) drives the countdown and pass expiry.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const upcoming = passes.filter((p) => minutesUntil(p.set.utc, now) > 0);
  const next = upcoming[0] ?? null;
  const countdown = next ? countdownLabel(next, now) : null;

  return (
    <SpotlightCard className="flex h-full flex-col p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#FF8C1A]">
          ISS Flyovers
        </p>
        {countdown && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#FF8C1A]/40 bg-[#FF8C1A]/10 px-2.5 py-1 text-xs font-semibold text-[#FF8C1A]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF8C1A] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF8C1A]" />
            </span>
            {countdown}
          </span>
        )}
      </div>

      <div className="mt-4 flex-1">
        {isLoading ? (
          <div className="h-28 animate-pulse rounded-xl bg-white/5" />
        ) : isError ? (
          <p className="text-sm text-[#AAB4C5]">
            Pass predictions unavailable — the element source (Celestrak) may
            be unreachable. They'll return on the next refresh.
          </p>
        ) : !next ? (
          <p className="text-sm text-[#AAB4C5]">
            No passes above 10° in the next 48 hours from your location.
          </p>
        ) : (
          <>
            <p className="text-sm text-[#AAB4C5]">
              <span className="font-semibold text-white">{satellite}</span>
              {" · next pass peaks at "}
              <span className="font-semibold text-white">
                {Math.round(next.max_altitude_deg)}°
              </span>
              {" for "}
              <span className="font-semibold text-white">
                {Math.round(next.duration_minutes)} min
              </span>
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <PassPoint label="Rises" point={next.rise} />
              <PassPoint label="Peak" point={next.peak} />
              <PassPoint label="Sets" point={next.set} />
            </div>
            {upcoming.length > 1 && (
              <ul className="mt-4 space-y-1 border-t border-white/10 pt-3">
                {upcoming.slice(1, 4).map((pass) => (
                  <li
                    key={pass.rise.utc}
                    className="flex items-baseline justify-between text-xs text-[#AAB4C5]"
                  >
                    <span className="tabular-nums">
                      {pass.rise.local} → {pass.set.local}
                    </span>
                    <span className="text-[#6B7280]">
                      peak {Math.round(pass.max_altitude_deg)}° ·{" "}
                      {Math.round(pass.duration_minutes)} min
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-[#6B7280]">
        <Satellite size={12} />
        SGP4 propagation · elements from Celestrak · passes above 10°
      </p>
    </SpotlightCard>
  );
}
