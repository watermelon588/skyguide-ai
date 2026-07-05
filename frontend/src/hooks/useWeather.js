import { useQuery } from "@tanstack/react-query";
import { fetchCurrentWeather } from "../services/weather.service";

/**
 * Round a coordinate for a stable query key. Sub-100m precision would only
 * fragment the cache; the weather is identical across a city block.
 */
const roundCoord = (value) =>
  typeof value === "number" ? Math.round(value * 1000) / 1000 : value;

/**
 * Lazily fetch current weather for the observer.
 *
 * The query stays disabled until `enabled` is turned on (first popover open)
 * AND real coordinates exist — so we never fetch for a user without a saved
 * location, and never on mount. Caching, staleness (10 min) and single-retry
 * come from the shared query client defaults.
 *
 * @param {{ latitude:number|null, longitude:number|null, enabled:boolean }} args
 */
export function useWeather({ latitude, longitude, enabled }) {
  const hasCoords =
    typeof latitude === "number" && typeof longitude === "number";

  return useQuery({
    queryKey: ["weather", roundCoord(latitude), roundCoord(longitude)],
    queryFn: () => fetchCurrentWeather(latitude, longitude),
    enabled: Boolean(enabled) && hasCoords,
  });
}
