import { useQuery } from "@tanstack/react-query";

import { fetchCatalog } from "../services/tonight.service";

/**
 * Objects worth hopping to from a target's page.
 *
 * "Similar" here means the two ways an observer actually thinks about "what
 * else": same TYPE (another galaxy, another nebula) and, preferentially, the
 * same CONSTELLATION — objects a small nudge of the telescope away. Both are
 * pulled brightest-first (sort=magnitude), because a discovery rail full of
 * anonymous mag-16 galaxies is useless; the notable ones are the point.
 *
 * Two cheap catalog queries, merged and de-duplicated, current object removed.
 */
export function useSimilarObjects(target, { limit = 8 } = {}) {
  const type = target?.object_type ?? null;
  const constellation = target?.constellation ?? null;
  const id = target?.catalog_id ?? null;

  const query = useQuery({
    queryKey: ["similar", id, type, constellation],
    enabled: Boolean(id && (type || constellation)),
    staleTime: 60 * 60 * 1000, // static catalog content
    queryFn: async () => {
      // Ask for a few extra so removing the current object and de-duping still
      // leaves a full rail.
      const per = limit + 4;
      const [sameConstellation, sameType] = await Promise.all([
        constellation
          ? fetchCatalog({ constellation, sort: "magnitude", limit: per }).catch(() => null)
          : Promise.resolve(null),
        type
          ? fetchCatalog({ type, sort: "magnitude", limit: per }).catch(() => null)
          : Promise.resolve(null),
      ]);

      const seen = new Set([id?.toUpperCase()]);
      const merged = [];
      // Same-constellation first (nearer in the sky), then same-type to fill.
      for (const group of [sameConstellation, sameType]) {
        for (const obj of group?.objects ?? []) {
          const key = obj.catalog_id?.toUpperCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          merged.push({
            catalog_id: obj.catalog_id,
            name: obj.name,
            object_type: obj.object_type,
            constellation: obj.constellation,
            magnitude: obj.physical?.magnitude ?? null,
            thumbnail: obj.media?.thumbnail ?? null,
            sameConstellation: obj.constellation === constellation,
          });
          if (merged.length >= limit) break;
        }
        if (merged.length >= limit) break;
      }
      return merged;
    },
  });

  return {
    objects: query.data ?? [],
    isLoading: query.isLoading,
  };
}
