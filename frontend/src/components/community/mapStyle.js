/**
 * MapLibre style for the community map.
 *
 * Esri's "Canvas Dark Gray Base" raster basemap: free, no API key. (CARTO's
 * dark_nolabels was the original choice, but CARTO now serves "API KEY
 * REQUIRED" watermark tiles to non-localhost origins.) Raster (not vector) on purpose: a vector style is a
 * ~30 KB JSON plus glyph and sprite fetches, and all we need is a dim backdrop
 * behind our own pins.
 *
 * The "Base" layer (not the "Reference" overlay) keeps labels to a few faint
 * country names, so third-party typography barely competes with Satoshi.
 *
 * Attribution is required by Esri and is rendered by
 * MapLibre's own attribution control — do not remove it.
 */

const BASEMAP_TILES = [
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
];

/**
 * Light-pollution overlay: David Lorenz's Light Pollution Atlas 2024
 * (https://djlorenz.github.io/astronomy/lp/), free static tiles on GitHub
 * Pages, no key. Native zoom tops out at 8 (~0.6 km/px at the equator) —
 * MapLibre overzooms beyond that, which is exactly right for a regional
 * overlay. Colors follow the atlas legend: black/gray dark -> blue -> green
 * -> yellow -> orange -> red -> white bright.
 */
export const LP_TILE_URL =
  "https://djlorenz.github.io/astronomy/image_tiles/tiles2024/tile_{z}_{x}_{y}.png";
export const LP_MAX_NATIVE_ZOOM = 8;
export const LP_ATTRIBUTION =
  '© <a href="https://djlorenz.github.io/astronomy/lp/">Lorenz Light Pollution Atlas 2024</a>';

/** The raster source + layer pair for the LP overlay, ready to addSource/addLayer. */
export const LP_SOURCE = {
  type: "raster",
  tiles: [LP_TILE_URL],
  tileSize: 256,
  maxzoom: LP_MAX_NATIVE_ZOOM,
  attribution: LP_ATTRIBUTION,
};

export const MAP_STYLE_DARK = {
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: BASEMAP_TILES,
      tileSize: 256,
      maxzoom: 16,
      attribution: "Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors",
    },
  },
  layers: [
    // The canvas showing through under the tiles — matches --bg exactly, so
    // ocean and un-loaded tiles read as page background rather than as holes.
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#000000" },
    },
    {
      id: "basemap",
      type: "raster",
      source: "basemap",
      paint: {
        // Knock the basemap back so our accent pins are the brightest thing on
        // it — the map is context, the observers are the content.
        "raster-opacity": 0.72,
        "raster-saturation": -0.3,
      },
    },
  ],
};
