import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../context/AuthContext";
import { getObserverLocation, hasLocation } from "../utils/location";
import {
  fetchCatalog,
  fetchMoon,
  fetchObservable,
} from "../services/tonight.service";
import { fetchCurrentWeather } from "../services/weather.service";

/** How long live-sky geometry stays fresh before a background refetch. */
const SKY_STALE_MS = 60 * 1000;
/** The static catalog barely changes — cache it for the whole session. */
const CATALOG_STALE_MS = 60 * 60 * 1000;

/**
 * Orchestrates every data stream the /tonight experience needs:
 *
 *   - visibility  -> ranked objects above the horizon right now (live geometry)
 *   - moon        -> full lunar state (phase, illumination, rise/set…)
 *   - weather     -> current weather + observing-conditions scoring
 *   - catalog     -> static science content (magnitude, size, tips, media)
 *
 * The catalog is merged into the visibility list client-side so the UI gets
 * one rich object per target. No astronomy is computed here — the FastAPI
 * Astro Engine owns all science.
 */
export function useTonight() {
  const { user } = useAuth();
  const located = hasLocation(user);
  const { latitude, longitude, timezone } = getObserverLocation(user);

  const coords = { latitude, longitude, timezone };

  const visibilityQuery = useQuery({
    queryKey: ["tonight", "visibility", latitude, longitude],
    queryFn: () => fetchObservable(coords),
    enabled: located,
    staleTime: SKY_STALE_MS,
    refetchInterval: 5 * 60 * 1000,
  });

  const moonQuery = useQuery({
    queryKey: ["tonight", "moon", latitude, longitude],
    queryFn: () => fetchMoon(coords),
    enabled: located,
    staleTime: SKY_STALE_MS,
    refetchInterval: 5 * 60 * 1000,
  });

  const weatherQuery = useQuery({
    queryKey: ["tonight", "weather", latitude, longitude],
    queryFn: () => fetchCurrentWeather(latitude, longitude),
    enabled: located,
    staleTime: 10 * 60 * 1000,
  });

  const catalogQuery = useQuery({
    queryKey: ["tonight", "catalog"],
    queryFn: () => fetchCatalog({ limit: 100 }),
    staleTime: CATALOG_STALE_MS,
  });

  // catalog_id -> full catalog document, for O(1) merging below.
  const catalogById = useMemo(() => {
    const map = new Map();
    for (const obj of catalogQuery.data?.objects ?? []) {
      map.set(obj.catalog_id, obj);
    }
    return map;
  }, [catalogQuery.data]);

  /**
   * The star of the show: every visible object enriched with its catalog
   * document. Ranking order comes from the engine and is preserved.
   */
  const targets = useMemo(() => {
    const visible = visibilityQuery.data?.objects ?? [];
    return visible.map((v, index) => {
      const doc = catalogById.get(v.catalog_id);
      return {
        ...v,
        rank: index + 1,
        magnitude: doc?.physical?.magnitude ?? null,
        angular_size_arcmin: doc?.physical?.angular_size_arcmin ?? null,
        distance_ly: doc?.physical?.distance_ly ?? null,
        difficulty: doc?.classification?.difficulty ?? null,
        season: doc?.classification?.season ?? null,
        description: doc?.content?.short_description ?? null,
        tips: doc?.content?.observation_tips ?? [],
        aliases: doc?.aliases ?? [],
        catalog: doc?.catalog ?? null,
        ra_deg: doc?.coordinates?.ra_deg ?? null,
        dec_deg: doc?.coordinates?.dec_deg ?? null,
        thumbnail: doc?.media?.thumbnail ?? null,
      };
    });
  }, [visibilityQuery.data, catalogById]);

  /** Catalog entries currently below the horizon (for the full explorer). */
  const belowHorizon = useMemo(() => {
    const visibleIds = new Set(targets.map((t) => t.catalog_id));
    return (catalogQuery.data?.objects ?? [])
      .filter((doc) => !visibleIds.has(doc.catalog_id))
      .map((doc) => ({
        catalog_id: doc.catalog_id,
        name: doc.name,
        object_type: doc.object_type,
        constellation: doc.constellation,
        altitude_deg: null,
        azimuth_deg: null,
        hour_angle_hours: null,
        visibility_score: null,
        rank: null,
        magnitude: doc.physical?.magnitude ?? null,
        angular_size_arcmin: doc.physical?.angular_size_arcmin ?? null,
        distance_ly: doc.physical?.distance_ly ?? null,
        difficulty: doc.classification?.difficulty ?? null,
        season: doc.classification?.season ?? null,
        description: doc.content?.short_description ?? null,
        tips: doc.content?.observation_tips ?? [],
        aliases: doc.aliases ?? [],
        catalog: doc.catalog ?? null,
        ra_deg: doc.coordinates?.ra_deg ?? null,
        dec_deg: doc.coordinates?.dec_deg ?? null,
        thumbnail: doc.media?.thumbnail ?? null,
      }));
  }, [catalogQuery.data, targets]);

  const isLoading =
    located &&
    (visibilityQuery.isLoading || moonQuery.isLoading || catalogQuery.isLoading);

  const isError = visibilityQuery.isError || moonQuery.isError;

  return {
    located,
    latitude,
    longitude,
    timezone,
    isLoading,
    isError,
    /** Live, ranked, catalog-enriched objects above the horizon. */
    targets,
    /** Catalog objects not currently visible (explorer's "below horizon"). */
    belowHorizon,
    moon: moonQuery.data?.moon ?? null,
    weather: weatherQuery.data?.weather ?? null,
    conditions: weatherQuery.data?.observing_conditions ?? null,
    utcTime: visibilityQuery.data?.utc_time ?? null,
    refetch: () => {
      visibilityQuery.refetch();
      moonQuery.refetch();
      weatherQuery.refetch();
    },
  };
}
