import { lazy, Suspense, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Users, MapPin, Lock, Compass, MessageSquare, Images } from "lucide-react";

import RadiusSelector from "../components/community/RadiusSelector";
import ObserverCard from "../components/community/ObserverCard";
import PingInbox from "../components/community/PingInbox";
import { useNearbyObservers } from "../hooks/useNearbyObservers";
import { usePings } from "../hooks/usePings";
import { useRooms } from "../hooks/useRooms";

// MapLibre is ~250 KB of engine nobody needs until they reach this page, and
// the grid below is the real content — so the map arrives separately.
const ObserverMap = lazy(() => import("../components/community/ObserverMap"));

/**
 * /community — Observers Nearby (Feature 6a).
 *
 * Discovery: a map of public observers within the chosen radius, plus the
 * distance-banded grid beneath it. Renders inside AppLayout (inherits the app
 * navbar). All privacy is enforced server-side; this page only reflects the
 * `gate` it's handed, and plots the coarse cell centres the API returns — it
 * never sees a real coordinate.
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
  const { observers, gate, count, center, isLoading, isFetching, isError } =
    useNearbyObservers(radius);
  const { incoming, outgoing, send, respond } = usePings();
  const { rooms } = useRooms();

  // Clicking a map pin scrolls to the first observer sharing that cell — the
  // pin is a group, and the card is where the actual actions live.
  const gridRef = useRef(null);
  const focusFromMap = (group) => {
    const first = group[0];
    if (!first) return;
    const el = gridRef.current?.querySelector(
      `[data-observer="${CSS.escape(first.username)}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Which observers already have an open request or a live conversation — so
  // the tile shows "Requested"/"Connected" instead of offering Ping again.
  const requested = new Set(outgoing.map((p) => p.user.username));
  const connected = new Set(
    rooms.filter((r) => r.kind === "direct").map((r) => r.username),
  );

  const pingStateFor = (username) => {
    if (connected.has(username)) return "connected";
    if (requested.has(username)) return "pending";
    if (send.isPending && send.variables?.username === username) return "sending";
    return "idle";
  };

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
        <div className="flex items-center gap-3">
          <Link
            to="/gallery"
            className="flex items-center gap-2 border border-line bg-surface-2 px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <Images size={14} /> Explore gallery
          </Link>
          <Link
            to="/community/chat"
            className="flex items-center gap-2 border border-line bg-surface-2 px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <MessageSquare size={14} /> Rooms
          </Link>
          <RadiusSelector
            value={radius}
            onChange={setRadius}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Chat requests waiting on this observer */}
      <div className="mt-6">
        <PingInbox
          incoming={incoming}
          outgoing={outgoing}
          busy={respond.isPending}
          onRespond={(id, action) => respond.mutate({ id, action })}
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
            {send.isError && (
              <p className="mb-4 border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
                {send.error?.response?.data?.message ||
                  "Couldn't send that request — try again."}
              </p>
            )}
            {/* The map — observers plotted on their coarse cell centres. */}
            <Suspense
              fallback={
                <div className="mb-6 h-[420px] animate-pulse border border-line bg-surface-2" />
              }
            >
              <div className="mb-6">
                <ObserverMap
                  observers={observers}
                  center={center}
                  radiusKm={radius}
                  onSelect={focusFromMap}
                />
              </div>
            </Suspense>

            <div
              ref={gridRef}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {observers.map((observer) => (
                <div key={observer.username} data-observer={observer.username}>
                  <ObserverCard
                    observer={observer}
                    pingState={pingStateFor(observer.username)}
                    onPing={(username) => send.mutate({ username })}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
