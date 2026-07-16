import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useTonight } from "./useTonight";
import { fetchCatalogObject } from "../services/tonight.service";

/** Flatten a full catalog document into the flat shape the panel renders. */
function flattenCatalogObject(doc) {
  if (!doc) return null;
  return {
    catalog_id: doc.catalog_id,
    name: doc.name,
    object_type: doc.object_type,
    constellation: doc.constellation,
    magnitude: doc.physical?.magnitude ?? null,
    angular_size_arcmin: doc.physical?.angular_size_arcmin ?? null,
    distance_ly: doc.physical?.distance_ly ?? null,
    difficulty: doc.classification?.difficulty ?? null,
    season: doc.classification?.season ?? null,
    description: doc.content?.short_description ?? null,
    tips: doc.content?.observation_tips ?? [],
    attribution: doc.content?.attribution ?? null,
    aliases: doc.aliases ?? [],
    catalog: doc.catalog ?? null,
    ra_deg: doc.coordinates?.ra_deg ?? null,
    dec_deg: doc.coordinates?.dec_deg ?? null,
    thumbnail: doc.media?.thumbnail ?? null,
    hero_image: doc.media?.hero_image ?? null,
    imageCredit: doc.media?.credit ?? null,
  };
}

/**
 * One celestial object, fully resolved for the Target Panel.
 *
 * The panel always fetches the object's full catalog document (rich content:
 * full description, tips, image credit, Wikipedia attribution, coordinates) and,
 * when the object is in tonight's live top-100, overlays its live geometry
 * (alt/az/airmass/set…). This is what makes any of the ~13k objects openable on
 * a cold URL (/tonight/NGC%20253) or from the Explore page — visible or not —
 * while a top-100 object still shows its live position. The full doc is cached
 * for an hour, so repeat opens are instant.
 *
 * `notFound` only becomes true once the by-id fetch has actually resolved to
 * nothing — never mid-fetch — so the page can tell "loading" from "no such id".
 */
export function useTargetDetail(catalogId) {
  const tonight = useTonight();
  const id = (catalogId || "").toUpperCase();

  const live = useMemo(
    () => tonight.targets.find((t) => t.catalog_id.toUpperCase() === id) ?? null,
    [tonight.targets, id],
  );

  const byIdQuery = useQuery({
    queryKey: ["catalog", "object", id],
    queryFn: () => fetchCatalogObject(catalogId),
    enabled: Boolean(catalogId),
    staleTime: 60 * 60 * 1000, // static content
  });

  const target = useMemo(() => {
    const doc = flattenCatalogObject(byIdQuery.data);
    // Live geometry (top-100) overlaid with the richer catalog content. `doc`
    // defines no geometry keys, so spreading it last keeps live's alt/az/set
    // while upgrading description, tips, imagery and attribution.
    if (live) return { ...live, ...(doc || {}), visible: true };
    if (doc) return { ...doc, visible: false };
    return null;
  }, [live, byIdQuery.data]);

  return {
    ...tonight, // located / isLoading / isError / moon / conditions etc.
    target,
    notFound: !live && byIdQuery.isFetched && !byIdQuery.data,
  };
}
