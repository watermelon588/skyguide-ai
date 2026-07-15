import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchPings,
  respondToPing,
  sendPing,
} from "../services/community.service";

/**
 * Chat requests — the consent gate in front of private rooms.
 *
 * Accepting creates a room, so every settle also invalidates the rooms query;
 * the new conversation appears in the switcher without a reload.
 */
export function usePings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["community", "pings"],
    queryFn: fetchPings,
    staleTime: 30 * 1000,
  });

  const settle = () => {
    queryClient.invalidateQueries({ queryKey: ["community", "pings"] });
    queryClient.invalidateQueries({ queryKey: ["community", "rooms"] });
  };

  const send = useMutation({
    mutationFn: ({ username, note }) => sendPing(username, note),
    onSuccess: settle,
  });

  const respond = useMutation({
    mutationFn: ({ id, action }) => respondToPing(id, action),
    onSuccess: settle,
  });

  return {
    incoming: query.data?.incoming ?? [],
    outgoing: query.data?.outgoing ?? [],
    isLoading: query.isLoading,
    send,
    respond,
    refetch: query.refetch,
  };
}
