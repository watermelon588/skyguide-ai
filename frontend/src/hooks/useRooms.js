import { useQuery } from "@tanstack/react-query";

import { fetchRooms } from "../services/community.service";

/**
 * The chat rooms this observer can enter: the global #first-light room always,
 * plus their regional room once a location is set (`hasRegion` is false until
 * then, which the UI turns into a "set your location" nudge).
 */
export function useRooms() {
  const query = useQuery({
    queryKey: ["community", "rooms"],
    queryFn: fetchRooms,
    staleTime: 5 * 60 * 1000, // rooms barely change; don't refetch on every mount
  });

  return {
    rooms: query.data?.rooms ?? [],
    hasRegion: query.data?.hasRegion ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
