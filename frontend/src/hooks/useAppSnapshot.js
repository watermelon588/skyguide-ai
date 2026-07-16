import { useCallback } from "react";
import { useLocation as useRoute } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { usePairingMaybe } from "../context/PairingContext";
import { useTonight } from "./useTonight";
import { useTelescope } from "./useTelescope";
import { useObservations } from "./useObservations";
import { getObserverLocation, formatPlaceName, hasLocation } from "../utils/location";

/**
 * The chat assistant's eyes: a compact JSON snapshot of what the user
 * currently sees, sent with every message so Astro's answers agree with the
 * dashboard in front of them.
 *
 * Reads the SAME React Query caches the visible UI renders from (useTonight,
 * useTelescope, useObservations) — by construction it cannot disagree with
 * the screen. Everything here is data the user's own client already holds;
 * nothing new is exposed. Kept to ~1–2 KB: top targets are truncated and
 * trimmed to the fields Astro can actually reason about.
 */

const TOP_TARGETS = 8;

export function useAppSnapshot() {
  const route = useRoute();
  const { user, isAuthenticated } = useAuth();
  const pairingCtx = usePairingMaybe();
  const tonight = useTonight();
  const { telescope } = useTelescope();
  const { planned } = useObservations({ enabled: isAuthenticated });

  return useCallback(() => {
    if (!isAuthenticated) {
      return { route: route.pathname, signed_in: false };
    }

    const { latitude, longitude, timezone } = getObserverLocation(user);
    const place = formatPlaceName(user?.location ?? {});

    return {
      route: route.pathname,
      signed_in: true,
      username: user?.username ?? null,
      location: hasLocation(user)
        ? {
            place: place ?? null,
            latitude: latitude != null ? Number(latitude.toFixed(2)) : null,
            longitude: longitude != null ? Number(longitude.toFixed(2)) : null,
            timezone: timezone ?? null,
          }
        : null,
      telescope: telescope
        ? {
            name: telescope.name ?? null,
            type: telescope.type ?? null,
            aperture_mm: telescope.aperture_mm ?? null,
            focal_length_mm: telescope.focal_length_mm ?? null,
          }
        : null,
      pairing: pairingCtx?.pairing?.status ?? "unavailable",
      moon: tonight.moon
        ? {
            illumination: tonight.moon.illumination,
            phase: tonight.moon.phase ?? null,
            above_horizon: tonight.moon.above_horizon ?? null,
          }
        : null,
      conditions: tonight.conditions
        ? {
            observing_quality: tonight.conditions.observing_quality ?? null,
            observing_score: tonight.conditions.observing_score ?? null,
          }
        : null,
      top_targets: tonight.targets.slice(0, TOP_TARGETS).map((t) => ({
        id: t.catalog_id,
        name: t.name ?? null,
        type: t.object_type ?? null,
        score: t.visibility_score,
        altitude_deg: Math.round(t.altitude_deg),
        sets: t.set ?? null,
      })),
      planned_targets: (planned ?? []).map((o) => o.catalog_id).slice(0, 20),
    };
  }, [route.pathname, isAuthenticated, user, telescope, pairingCtx, tonight, planned]);
}
