import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchCatalogPage, fetchStats } from "../services/catalog.service";

/** Catalog aggregates for the Explore charts. Static — cached for the session. */
export function useCatalogStats() {
  return useQuery({
    queryKey: ["catalog", "stats"],
    queryFn: fetchStats,
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * One filtered/paged slice of the catalog for the browser table.
 *
 * `keepPreviousData` holds the current page visible while the next loads, so
 * paging and filtering don't flash an empty table.
 */
export function useCatalogBrowse(params) {
  return useQuery({
    queryKey: ["catalog", "browse", params],
    queryFn: () => fetchCatalogPage(params),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}
