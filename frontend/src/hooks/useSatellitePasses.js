import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../context/AuthContext";
import { getObserverLocation, hasLocation } from "../utils/location";
import { fetchPasses } from "../services/satellite.service";

/**
 * Upcoming ISS passes for the signed-in observer.
 *
 * TLE-based predictions drift by seconds over hours, not minutes — a 30 min
 * stale time is generous, and the engine's on-disk TLE cache makes refetches
 * cheap anyway.
 */
export function useSatellitePasses({ satellite = "ISS", hours = 48 } = {}) {
  const { user } = useAuth();
  const located = hasLocation(user);
  const { latitude, longitude, timezone } = getObserverLocation(user);

  const query = useQuery({
    queryKey: ["satellites", satellite, hours, latitude, longitude],
    queryFn: () =>
      fetchPasses({ latitude, longitude, timezone, hours, satellite }),
    enabled: located,
    staleTime: 30 * 60 * 1000,
    retry: 1, // Celestrak may be down — fail fast to the quiet error state
  });

  return {
    located,
    isLoading: query.isLoading,
    isError: query.isError,
    satellite: query.data?.satellite ?? satellite,
    passes: query.data?.passes ?? [],
  };
}
