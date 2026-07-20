import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchPings,
  respondToPing,
  sendPing,
} from "../services/community.service";
import { useToast } from "../context/ToastContext";

/**
 * Chat requests — the consent gate in front of private rooms.
 *
 * Accepting creates a room, so every settle also invalidates the rooms query;
 * the new conversation appears in the switcher without a reload. Every mutation
 * gives the observer a toast — send and respond had no feedback before.
 */
export function usePings() {
  const queryClient = useQueryClient();
  const toast = useToast();

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
    onSuccess: (result) => {
      if (result?.alreadyConnected) {
        toast.info("You're already connected — opening your conversation.");
      } else if (result?.autoAccepted) {
        toast.success("You both pinged — you're connected now.");
      } else {
        toast.success("Request sent. You'll hear back if they accept.");
      }
      settle();
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Couldn't send that request — try again.",
      );
    },
  });

  const respond = useMutation({
    mutationFn: ({ id, action }) => respondToPing(id, action),
    onSuccess: (_result, { action }) => {
      toast.success(
        action === "accept" ? "Request accepted — say hello." : "Request declined.",
      );
      settle();
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Couldn't update that request — try again.",
      );
    },
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
