import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Users, Layers, Moon } from "lucide-react";

import { MAP_STYLE_DARK, LP_SOURCE } from "./mapStyle";

/**
 * The community map — observers near you, plotted honestly.
 *
 * Built on MapLibre GL with CARTO's free dark basemap (the same engine and
 * tiles mapcn.dev uses), but written against SkyGuide's own design system
 * rather than pulling shadcn's Card and its competing CSS variables: flat
 * surfaces, hairlines, radius 0, electric blue as the only accent.
 *
 * PRIVACY — the whole point. Every pin is the CENTRE of the observer's
 * geohash-4 cell (~39 km × ~20 km), computed server-side in
 * communityService.approxPoint. Nobody's real coordinates reach this component,
 * so there is nothing here to leak. Observers in one cell land on one point, so
 * pins are grouped and shown as a count — which is both the truthful rendering
 * and the reason the map can't be used to find anyone's house.
 *
 * The radius circle is drawn around the VIEWER's cell centre too, so it is an
 * honest illustration of the search area rather than a precise ring around
 * their home.
 */

const MIN_ZOOM = 2;

/**
 * MapLibre needs WebGL and throws from its constructor without it (old
 * hardware, disabled GPU, some remote-desktop sessions). Checked BEFORE the
 * map effect runs so the failure is a plain render decision rather than a
 * try/catch that has to setState from inside an effect.
 */
function webglAvailable() {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

/** Group observers onto their shared cell-centre pins. */
function groupByPoint(observers) {
  const groups = new Map();
  for (const observer of observers) {
    const point = observer.approx;
    if (!point) continue; // no cell yet — stays in the grid, off the map
    const key = `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`;
    const existing = groups.get(key);
    if (existing) existing.observers.push(observer);
    else groups.set(key, { key, point, observers: [observer] });
  }
  return [...groups.values()];
}

/** A GeoJSON circle (64-gon) of `radiusKm` around a point, for the search area. */
function circleGeoJson(center, radiusKm) {
  const steps = 64;
  const coords = [];
  const latRad = (center.latitude * Math.PI) / 180;
  const kmPerDegLat = 110.574;
  const kmPerDegLon = 111.32 * Math.cos(latRad);

  for (let i = 0; i <= steps; i += 1) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([
      center.longitude + (radiusKm / kmPerDegLon) * Math.cos(theta),
      center.latitude + (radiusKm / kmPerDegLat) * Math.sin(theta),
    ]);
  }

  return {
    type: "FeatureCollection",
    features: [
      { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] } },
    ],
  };
}

/** Zoom that fits a radius into a ~420px-tall viewport, roughly. */
function zoomForRadius(radiusKm) {
  if (radiusKm <= 25) return 8.6;
  if (radiusKm <= 50) return 7.7;
  return 6.7;
}

export default function ObserverMap({ observers, center, radiusKm, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [supported] = useState(webglAvailable);
  const [showLp, setShowLp] = useState(false);

  const groups = useMemo(() => groupByPoint(observers), [observers]);

  // ---- map lifecycle (created once; never re-created on data change) -------
  useEffect(() => {
    if (!containerRef.current || !center || !supported) return undefined;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_DARK,
      center: [center.longitude, center.latitude],
      zoom: zoomForRadius(radiusKm),
      minZoom: MIN_ZOOM,
      attributionControl: { compact: true },
      // The sky is the product; the map is a locator. Keep it flat and calm.
      pitchWithRotate: false,
      dragRotate: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (e) => {
      // Tile/style failures shouldn't blank the page — the grid below still works.
      if (e?.error?.status >= 400) setFailed(true);
    });
    map.on("load", () => setReady(true));

    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // center/radius changes are handled by the effects below — re-creating the
    // map on a radius chip tap would flash the whole canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!center, supported]);

  // ---- light-pollution overlay (Lorenz atlas) -------------------------------
  // Source added lazily on first toggle; afterwards only visibility flips, so
  // toggling is instant and re-toggling never refetches tiles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (!map.getSource("lp-overlay")) {
      if (!showLp) return; // never pay for tiles the user hasn't asked for
      map.addSource("lp-overlay", LP_SOURCE);
      // Inserted beneath the first symbol-less spot — markers are DOM
      // elements, so the overlay can simply sit on top of the basemap.
      map.addLayer({
        id: "lp-overlay",
        type: "raster",
        source: "lp-overlay",
        paint: { "raster-opacity": 0.55 },
      });
      return;
    }
    map.setLayoutProperty("lp-overlay", "visibility", showLp ? "visible" : "none");
  }, [ready, showLp]);

  // ---- the search-area circle ---------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !center) return;

    const data = circleGeoJson(center, radiusKm);
    const source = map.getSource("search-area");

    if (source) {
      source.setData(data);
    } else {
      map.addSource("search-area", { type: "geojson", data });
      map.addLayer({
        id: "search-area-fill",
        type: "fill",
        source: "search-area",
        paint: { "fill-color": "#0049CD", "fill-opacity": 0.08 },
      });
      map.addLayer({
        id: "search-area-line",
        type: "line",
        source: "search-area",
        paint: {
          "line-color": "#0049CD",
          "line-width": 1,
          "line-opacity": 0.5,
        },
      });
    }

    map.easeTo({
      center: [center.longitude, center.latitude],
      zoom: zoomForRadius(radiusKm),
      duration: 500,
    });
  }, [ready, center, radiusKm]);

  // ---- pins ---------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // The viewer — a ring, visually distinct from the observer pins.
    if (center) {
      markersRef.current.push(
        new maplibregl.Marker({ element: viewerPin() })
          .setLngLat([center.longitude, center.latitude])
          .addTo(map),
      );
    }

    for (const group of groups) {
      const el = observerPin(group.observers.length);
      el.addEventListener("click", () => onSelect?.(group.observers));
      markersRef.current.push(
        new maplibregl.Marker({ element: el })
          .setLngLat([group.point.longitude, group.point.latitude])
          .addTo(map),
      );
    }
  }, [ready, groups, center, onSelect]);

  // No map is better than a broken one: the observer grid below carries the
  // same information, so a missing centre, dead tiles or no WebGL just means
  // this section isn't there.
  if (!center || failed || !supported) return null;

  return (
    <div className="relative w-full overflow-hidden border border-line bg-surface-2">
      <div ref={containerRef} className="h-[420px] w-full" />

      {/* Light-pollution layer toggle. */}
      <button
        type="button"
        onClick={() => setShowLp((v) => !v)}
        aria-pressed={showLp}
        title="Light pollution overlay (Lorenz Atlas 2024)"
        className={`absolute left-3 top-3 flex items-center gap-2 border px-3 py-2 text-xs font-medium transition-colors ${
          showLp
            ? "border-accent/50 bg-accent/15 text-accent-hi"
            : "border-line bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink"
        }`}
      >
        <Moon size={13} />
        Light pollution
      </button>

      {/* Legend — states the privacy model in the one place people will read it. */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-1.5 border border-line bg-surface-2/95 px-3 py-2.5 text-[11px]">
        <span className="flex items-center gap-2 text-ink-2">
          <span className="h-2.5 w-2.5 shrink-0 border border-accent bg-accent/40" />
          You
        </span>
        <span className="flex items-center gap-2 text-ink-2">
          <Users size={11} className="shrink-0 text-accent" />
          Observers ({observers.length})
        </span>
        <span className="mt-0.5 flex max-w-[190px] items-start gap-1.5 text-ink-3">
          <Layers size={11} className="mt-0.5 shrink-0" />
          Pins mark ~40 km areas, not addresses.
        </span>
      </div>
    </div>
  );
}

/* ---------- pin elements (imperative — MapLibre owns the DOM) ---------- */

function viewerPin() {
  const el = document.createElement("div");
  el.className =
    "h-3.5 w-3.5 border-2 border-accent bg-accent/40 shadow-[0_0_0_4px_rgba(0,73,205,0.18)]";
  el.title = "Your area";
  return el;
}

function observerPin(count) {
  const el = document.createElement("button");
  el.type = "button";
  el.className =
    "flex h-7 min-w-[28px] cursor-pointer items-center justify-center border border-accent bg-[#0A0A0B] px-1.5 text-[11px] font-bold text-ink transition-colors hover:bg-accent";
  el.textContent = String(count);
  el.title =
    count === 1 ? "1 observer in this area" : `${count} observers in this area`;
  return el;
}
