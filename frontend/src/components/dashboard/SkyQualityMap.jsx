import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { MAP_STYLE_DARK, LP_SOURCE } from "../community/mapStyle";

/**
 * The Sky Quality card's mini-map: CARTO dark base + the light-pollution
 * atlas overlay + the observer pin + pins for the suggested darker sites.
 *
 * Split from SkyQualityCard so MapLibre (~1 MB) loads as its own lazy chunk
 * only when the card actually renders — same treatment as ObserverMap.
 *
 * Display only: all sampling/classification happens in the astro engine.
 */
export default function SkyQualityMap({ latitude, longitude, sites = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_DARK,
      center: [longitude, latitude],
      zoom: 7,
      minZoom: 3,
      attributionControl: { compact: true },
      pitchWithRotate: false,
      dragRotate: false,
    });

    map.on("load", () => {
      map.addSource("light-pollution", LP_SOURCE);
      map.addLayer({
        id: "light-pollution",
        type: "raster",
        source: "light-pollution",
        // Loud enough to read the color zones, quiet enough that the pins win.
        paint: { "raster-opacity": 0.6 },
      });
    });

    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // Recentering on a location change is handled by the pins effect below —
    // recreating the whole map would flash it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const you = document.createElement("div");
    you.className =
      "h-3.5 w-3.5 border-2 border-accent bg-accent/40 shadow-[0_0_0_4px_rgba(0,73,205,0.18)]";
    you.title = "Your location";
    markersRef.current.push(
      new maplibregl.Marker({ element: you })
        .setLngLat([longitude, latitude])
        .addTo(map),
    );

    for (const site of sites) {
      const el = document.createElement("div");
      el.className =
        "flex h-6 min-w-[24px] items-center justify-center border border-success bg-[#0A0A0B] px-1 text-[10px] font-bold text-success";
      el.textContent = `B${site.bortle}`;
      el.title = site.place
        ? `${site.place} — Bortle ${site.bortle}, ${site.distance_km} km ${site.bearing}`
        : `Bortle ${site.bortle}, ${site.distance_km} km ${site.bearing}`;
      markersRef.current.push(
        new maplibregl.Marker({ element: el })
          .setLngLat([site.longitude, site.latitude])
          .addTo(map),
      );
    }

    map.jumpTo({ center: [longitude, latitude] });
  }, [latitude, longitude, sites]);

  return <div ref={containerRef} className="h-[220px] w-full" />;
}
