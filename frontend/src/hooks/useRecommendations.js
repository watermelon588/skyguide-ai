import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../context/AuthContext";
import { getObserverLocation, hasLocation } from "../utils/location";
import {
  fetchBrief,
  fetchDarkSites,
  fetchRecommendations,
  fetchSkyQuality,
} from "../services/recommendation.service";

/**
 * Live-sky data ages slowly; the gateway serves a cached sky (stale-while-
 * revalidate) so a 10-min poll is plenty and never lands on a blank panel.
 */
const RECS_STALE_MS = 10 * 60 * 1000;
/** The gateway holds a brief ~3 h fresh; matching here avoids pointless refetches. */
const BRIEF_STALE_MS = 3 * 60 * 60 * 1000;
/** The light-pollution atlas is a static yearly dataset. */
const SKY_STALE_MS = 24 * 60 * 60 * 1000;

/**
 * Personalized recommendations (Feature 8) — the ranked list, per-target
 * reasons and best windows. Keyed on coordinates so a location change
 * recomputes; disabled until a location exists (the gateway would 400).
 */
export function useRecommendations({ limit = 10, enabled = true } = {}) {
  const { user } = useAuth();
  const located = hasLocation(user);
  const { latitude, longitude } = getObserverLocation(user);

  const query = useQuery({
    queryKey: ["recommendations", latitude, longitude, limit],
    queryFn: () => fetchRecommendations(limit),
    enabled: enabled && located,
    staleTime: RECS_STALE_MS,
    refetchInterval: RECS_STALE_MS,
  });

  const data = query.data ?? null;
  return {
    located,
    isLoading: query.isLoading,
    isError: query.isError,
    objects: data?.objects ?? [],
    moon: data?.moon ?? null,
    darkness: data?.darkness ?? null,
    skyQuality: data?.sky_quality ?? null,
    telescopeUsed: data?.telescope_used ?? null,
    refetch: query.refetch,
  };
}

/** Tonight's Brief — the nightly LLM summary. */
export function useBrief({ enabled = true } = {}) {
  const { user } = useAuth();
  const located = hasLocation(user);
  const { latitude, longitude } = getObserverLocation(user);

  const query = useQuery({
    queryKey: ["brief", latitude, longitude],
    queryFn: fetchBrief,
    enabled: enabled && located,
    staleTime: BRIEF_STALE_MS,
    retry: 1, // an LLM hiccup shouldn't hammer the gateway
  });

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    brief: query.data?.brief ?? null,
    generatedAt: query.data?.generatedAt ?? null,
  };
}

/** Sky quality + darker sites for the Sky Quality card. */
export function useSkyQuality({ enabled = true } = {}) {
  const { user } = useAuth();
  const located = hasLocation(user);
  const { latitude, longitude } = getObserverLocation(user);

  const sampleQuery = useQuery({
    queryKey: ["sky-quality", latitude, longitude],
    queryFn: fetchSkyQuality,
    enabled: enabled && located,
    staleTime: SKY_STALE_MS,
  });

  const sitesQuery = useQuery({
    queryKey: ["dark-sites", latitude, longitude],
    queryFn: () => fetchDarkSites(150),
    enabled: enabled && located,
    staleTime: SKY_STALE_MS,
  });

  return {
    located,
    latitude,
    longitude,
    isLoading: sampleQuery.isLoading || sitesQuery.isLoading,
    isError: sampleQuery.isError && sitesQuery.isError,
    sample: sampleQuery.data?.sample ?? null,
    atlasYear: sampleQuery.data?.atlas_year ?? null,
    sites: sitesQuery.data?.sites ?? [],
    searchedKm: sitesQuery.data?.searched_km ?? null,
  };
}
