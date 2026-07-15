import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MapPin, Telescope } from "lucide-react";

import Starfield from "../components/tonight/Starfield";
import Avatar from "../components/profile/Avatar";
import StatsBand from "../components/profile/StatsBand";
import { fetchPublicProfile } from "../services/profile.service";

/**
 * /observers/:username — an observer's public profile.
 *
 * Reachable anonymously; the gateway gates visibility (private → 404,
 * observers-only → 403 for anonymous). Standalone starfield surface, like the
 * target panel. Never renders email or coordinates — the payload doesn't
 * contain them.
 */

function Shell({ children }) {
  return (
    <div className="relative min-h-screen bg-bg text-ink">
      <Starfield />
      <nav className="relative z-20 mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
        <Link
          to="/dashboard"
          className="border border-line bg-surface-2 px-4 py-2 text-sm text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
        >
          ← Dashboard
        </Link>
        <span className="text-sm font-black uppercase tracking-tight text-ink">
          SkyGuide <span className="text-accent">AI</span>
        </span>
      </nav>
      <main className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-24">
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

export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["profile", "public", username],
    queryFn: () => fetchPublicProfile(username),
    retry: false, // 403/404 are answers, not failures to retry
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="h-72 animate-pulse border border-line bg-surface-2" />
      </Shell>
    );
  }

  if (error) {
    const status = error.response?.status;
    return (
      <Shell>
        <Centered
          title={status === 403 ? "Observers only" : "Observer not found"}
          body={
            status === 403
              ? "This observer shares their profile only with signed-in observers."
              : "No public profile exists at this address."
          }
          cta={
            status === 403 ? (
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mt-5 bg-accent px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-hi"
              >
                Sign in
              </button>
            ) : null
          }
        />
      </Shell>
    );
  }

  const memberSince = data.memberSince
    ? new Date(data.memberSince).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Shell>
      <section className="border border-line bg-surface-2 p-8">
        <div className="flex flex-wrap items-center gap-6">
          <Avatar
            src={data.avatar}
            name={data.displayName || data.username}
            size={96}
          />
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-ink">
              {data.displayName || data.username}
            </h1>
            <p className="text-sm text-ink-3">@{data.username}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
              {data.place && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-accent" />
                  {data.place}
                </span>
              )}
              {memberSince && <span>Observing since {memberSince}</span>}
            </div>
          </div>
        </div>

        {data.bio && (
          <p className="mt-6 leading-relaxed text-ink-2">{data.bio}</p>
        )}

        {data.telescope && (
          <div className="mt-6 flex items-center gap-3 border border-line bg-surface-3 px-4 py-3">
            <Telescope size={18} className="shrink-0 text-accent" />
            <p className="text-sm text-ink">
              {data.telescope.name}
              {data.telescope.aperture_mm && (
                <span className="text-ink-3">
                  {" "}
                  · {data.telescope.aperture_mm}mm
                  {data.telescope.focal_length_mm &&
                    ` f/${(data.telescope.focal_length_mm / data.telescope.aperture_mm).toFixed(1)}`}
                </span>
              )}
            </p>
          </div>
        )}
      </section>

      <section className="mt-4 border border-line bg-surface-2 p-6">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
          Observing résumé
        </p>
        <StatsBand stats={data.stats} />
      </section>
    </Shell>
  );
}
