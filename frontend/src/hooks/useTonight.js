import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../context/AuthContext";
import { getObserverLocation, hasLocation } from "../utils/location";
import { fetchMoon, fetchObservable } from "../services/tonight.service";
import { fetchCurrentWeather } from "../services/weather.service";

/** How long live-sky geometry stays fresh before a background refetch. */
const SKY_STALE_MS = 60 * 1000;

/**
 * Orchestrates the data streams the /tonight experience needs:
 *
 *   - visibility  -> tonight's TOP recommended objects (live geometry + the
 *                    object's own display fields), ranked by score
 *   - moon        -> full lunar state (phase, illumination, rise/set…)
 *   - weather     -> current weather + observing-conditions scoring
 *
 * The catalog grew to ~13k objects, so this no longer pulls the whole catalog
 * to merge client-side (that was multi-megabyte and mostly invisible). The
 * visibility endpoint returns the top ~100 already enriched with magnitude,
 * size, difficulty, description and thumbnail. The full catalog lives on the
 * Explore page; a single object's full dossier is fetched by id in
 * useTargetDetail. No astronomy is computed here — the Astro Engine owns it.
 */
export function useTonight() {
  const { user } = useAuth();
  const located = hasLocation(user);
  const { latitude, longitude, timezone } = getObserverLocation(user);

  const coords = { latitude, longitude, timezone };

  const visibilityQuery = useQuery({
    queryKey: ["tonight", "visibility", latitude, longitude],
    queryFn: () => fetchObservable(coords),
    enabled: located,
    staleTime: SKY_STALE_MS,
    refetchInterval: 5 * 60 * 1000,
  });

  const moonQuery = useQuery({
    queryKey: ["tonight", "moon", latitude, longitude],
    queryFn: () => fetchMoon(coords),
    enabled: located,
    staleTime: SKY_STALE_MS,
    refetchInterval: 5 * 60 * 1000,
  });

  const weatherQuery = useQuery({
    queryKey: ["tonight", "weather", latitude, longitude],
    queryFn: () => fetchCurrentWeather(latitude, longitude),
    enabled: located,
    staleTime: 10 * 60 * 1000,
  });

  /**
   * The night's ranked top targets. The engine already returns them enriched
   * and in score order; we only stamp the display rank and normalise the two
   * fields the UI still reads under different names.
   */
  const targets = useMemo(() => {
    const visible = visibilityQuery.data?.objects ?? [];
    return visible.map((v, index) => ({
      ...v,
      rank: index + 1,
      description: v.short_description ?? null,
      tips: v.observation_tips ?? [],
    }));
  }, [visibilityQuery.data]);

  const isLoading =
    located && (visibilityQuery.isLoading || moonQuery.isLoading);

  const isError = visibilityQuery.isError || moonQuery.isError;

  return {
    located,
    latitude,
    longitude,
    timezone,
    isLoading,
    isError,
    /** Live, ranked, self-enriched top targets above the horizon. */
    targets,
    /**
     * Retained for API compatibility with older callers. The full below-horizon
     * catalog now lives on the Explore page, not in this hook.
     */
    belowHorizon: [],
    moon: moonQuery.data?.moon ?? null,
    weather: weatherQuery.data?.weather ?? null,
    conditions: weatherQuery.data?.observing_conditions ?? null,
    utcTime: visibilityQuery.data?.utc_time ?? null,
    refetch: () => {
      visibilityQuery.refetch();
      moonQuery.refetch();
      weatherQuery.refetch();
    },
  };
}
