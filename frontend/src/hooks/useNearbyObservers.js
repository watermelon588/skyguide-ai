import { useQuery } from "@tanstack/react-query";

import { fetchNearbyObservers } from "../services/community.service";

/**
 * Nearby observers for the community map, keyed by radius so switching the
 * 25 / 50 / 100 km chips swaps between cached result sets instead of refetching
 * what's already been seen. Placeholder-keeps the previous radius' data while
 * the next loads, so the grid doesn't flash empty on a chip tap.
 */
export function useNearbyObservers(radiusKm) {
  const query = useQuery({
    queryKey: ["community", "nearby", radiusKm],
    queryFn: () => fetchNearbyObservers(radiusKm),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const data = query.data ?? null;

  return {
    observers: data?.observers ?? [],
    gate: data?.gate ?? null, // "private" | "no-location" | null
    count: data?.count ?? 0,
    /** The viewer's own geohash-cell centre — where the map opens. */
    center: data?.center ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}
