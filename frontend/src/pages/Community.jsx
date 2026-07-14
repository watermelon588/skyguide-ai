import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, MapPin, Lock, Compass } from "lucide-react";

import RadiusSelector from "../components/community/RadiusSelector";
import ObserverCard from "../components/community/ObserverCard";
import { useNearbyObservers } from "../hooks/useNearbyObservers";

/**
 * /community — Observers Nearby (Feature 6a).
 *
 * Discovery only: a distance-banded grid of public observers within the chosen
 * radius. Renders inside AppLayout (inherits the app navbar). All privacy is
 * enforced server-side; this page only reflects the `gate` it's handed.
 */

/** Shared shell for the non-grid states, so they sit consistently on the page. */
function StateCard({ icon: Icon, title, children }) {
  return (
    <div className="mx-auto mt-10 flex max-w-lg flex-col items-center border border-line bg-surface-2 px-8 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center border border-line bg-surface-3 text-accent">
        <Icon size={24} />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-ink-2">{children}</div>
    </div>
  );
}

export default function Community() {
  const [radius, setRadius] = useState(50);
  const { observers, gate, count, isLoading, isFetching, isError } =
    useNearbyObservers(radius);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
            Community
          </p>
          <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-bold text-ink">
            <Users size={26} className="text-accent" />
            Observers nearby
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            Astronomers sharing your sky — distances are approximate for privacy.
          </p>
        </div>
        <RadiusSelector
          value={radius}
          onChange={setRadius}
          disabled={isLoading}
        />
      </div>

      {/* Body */}
      <div className="mt-8">
        {isError ? (
          <StateCard icon={Compass} title="Couldn't load observers">
            Check that the gateway is running and try again.
          </StateCard>
        ) : gate === "private" ? (
          <StateCard icon={Lock} title="You're set to private">
            To see who observes near you, your own profile has to be
            discoverable. Set visibility to <strong>Public</strong> or{" "}
            <strong>Observers only</strong> — you must share a sky to find one.
            <div className="mt-5">
              <Link
                to="/profile"
                className="inline-block bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hi"
              >
                Adjust privacy settings
              </Link>
            </div>
          </StateCard>
        ) : gate === "no-location" ? (
          <StateCard icon={MapPin} title="Set your observing location">
            Nearby observers are found relative to where you observe from. Add
            your location on the dashboard to join the map.
            <div className="mt-5">
              <Link
                to="/dashboard"
                className="inline-block bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hi"
              >
                Set location
              </Link>
            </div>
          </StateCard>
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse border border-line bg-surface-2"
              />
            ))}
          </div>
        ) : observers.length === 0 ? (
          <StateCard icon={Compass} title="No observers within range yet">
            Nobody's sharing their location within {radius} km right now. Try a
            wider radius, or check back as SkyGuide grows.
          </StateCard>
        ) : (
          <>
            <p className="mb-4 text-sm text-ink-3">
              {count} {count === 1 ? "observer" : "observers"} within {radius} km
              {isFetching && " · updating…"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {observers.map((observer) => (
                <ObserverCard key={observer.username} observer={observer} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
