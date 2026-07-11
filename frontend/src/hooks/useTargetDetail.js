import { useMemo } from "react";

import { useTonight } from "./useTonight";

/**
 * One celestial object, fully resolved for the Target Panel.
 *
 * Reads the same useTonight queries every other surface uses (React Query
 * dedupes), so navigating from a list is instant and a cold URL like
 * /tonight/M42 self-hydrates. Objects come back in two flavors:
 *   - above the horizon  -> full live geometry (alt/az/airmass/set…)
 *   - below the horizon  -> catalog data only, `visible: false`
 *
 * `notFound` is only true once the catalog has actually loaded — never
 * during the fetch — so the page can distinguish "loading" from "no such id".
 */
export function useTargetDetail(catalogId) {
  const tonight = useTonight();
  const id = (catalogId || "").toUpperCase();

  const target = useMemo(() => {
    const live = tonight.targets.find((t) => t.catalog_id === id);
    if (live) return { ...live, visible: true };
    const cold = tonight.belowHorizon.find((t) => t.catalog_id === id);
    if (cold) return { ...cold, visible: false };
    return null;
  }, [tonight.targets, tonight.belowHorizon, id]);

  const catalogLoaded =
    tonight.targets.length + tonight.belowHorizon.length > 0;

  return {
    ...tonight, // located / isLoading / isError / moon / conditions etc.
    target,
    notFound: catalogLoaded && !tonight.isLoading && target === null,
  };
}
