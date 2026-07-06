import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getTelescope,
  createTelescope,
  updateTelescope,
  deleteTelescope as removeRemote,
} from "../services/telescope.service";
import { useAuth } from "../context/AuthContext";

const TELESCOPE_KEY = ["telescope"];

/**
 * Owns the user's saved telescope (REST-backed via React Query).
 *
 * The public shape is unchanged from the Session 10 LocalStorage version —
 * `{ telescope, hasTelescope, saveTelescope, deleteTelescope }` — so the
 * dashboard cards need no edits. `saveTelescope`/`deleteTelescope` stay
 * fire-and-forget (callers don't await): the mutation writes through the query
 * cache, so the dashboard re-renders as soon as the server confirms. A couple of
 * status flags (`isLoading`, `isSaving`, `error`) are added for optional use.
 *
 * The query is gated on auth so it never fires (and 401s) before login.
 */
export function useTelescope() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const {
    data: telescope = null,
    isLoading,
    error,
  } = useQuery({
    queryKey: TELESCOPE_KEY,
    queryFn: getTelescope,
    enabled: isAuthenticated,
  });

  const saveMutation = useMutation({
    // Both endpoints upsert; pick by existence for correct REST semantics.
    mutationFn: (next) => (telescope ? updateTelescope(next) : createTelescope(next)),
    onSuccess: (saved) => {
      queryClient.setQueryData(TELESCOPE_KEY, saved);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: removeRemote,
    onSuccess: () => {
      queryClient.setQueryData(TELESCOPE_KEY, null);
    },
  });

  const saveTelescope = useCallback(
    (next) => saveMutation.mutate(next),
    [saveMutation],
  );

  const deleteTelescope = useCallback(
    () => deleteMutation.mutate(),
    [deleteMutation],
  );

  return {
    telescope,
    hasTelescope: !!telescope,
    saveTelescope,
    deleteTelescope,
    isLoading,
    isSaving: saveMutation.isPending,
    error,
  };
}
