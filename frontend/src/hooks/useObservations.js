import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addObservation,
  fetchObservations,
  removeObservation,
  updateObservation,
} from "../services/observation.service";

const KEY = ["observations"];

/**
 * The observation planner's single state source.
 *
 * One query holds the user's full list (plan + history — it's small); every
 * mutation settles by invalidating that query, and add/resolve apply
 * optimistic patches so the UI answers instantly at the telescope.
 *
 * Exposes derived views (`planned`, `history`, `plannedIds`) so consumers
 * never re-implement the lifecycle split.
 */
export function useObservations({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: () => fetchObservations(),
    enabled,
    staleTime: 60 * 1000,
  });

  const observations = useMemo(
    () => query.data?.observations ?? [],
    [query.data],
  );

  const planned = useMemo(
    () => observations.filter((o) => o.status === "planned"),
    [observations],
  );

  const history = useMemo(
    () => observations.filter((o) => o.status !== "planned"),
    [observations],
  );

  /** catalog_id -> planned entry, for O(1) "is this on my plan?" checks. */
  const plannedByCatalogId = useMemo(() => {
    const map = new Map();
    for (const entry of planned) map.set(entry.catalog_id, entry);
    return map;
  }, [planned]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

  const patchCache = (updater) => {
    queryClient.setQueryData(KEY, (current) => {
      if (!current) return current;
      const next = updater(current.observations);
      return { count: next.length, observations: next };
    });
  };

  const add = useMutation({
    mutationFn: (payload) => addObservation(payload),
    onSuccess: (created) => {
      // Insert immediately; the invalidate confirms against the server.
      patchCache((list) => [created, ...list]);
    },
    onSettled: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, changes }) => updateObservation(id, changes),
    onMutate: async ({ id, changes }) => {
      // Optimistic: resolve/re-plan/notes reflect instantly.
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData(KEY);
      patchCache((list) =>
        list.map((o) => (o._id === id ? { ...o, ...changes } : o)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(KEY, context.previous);
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id) => removeObservation(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: KEY });
      const previous = queryClient.getQueryData(KEY);
      patchCache((list) => list.filter((o) => o._id !== id));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(KEY, context.previous);
    },
    onSettled: invalidate,
  });

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    observations,
    planned,
    history,
    plannedByCatalogId,
    /** True while any mutation is in flight (disable double-taps). */
    isMutating: add.isPending || update.isPending || remove.isPending,
    add,
    update,
    remove,
  };
}
