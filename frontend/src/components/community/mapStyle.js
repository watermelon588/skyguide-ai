/**
 * MapLibre style for the community map.
 *
 * CARTO's dark-matter raster basemap: free, no API key, no account — the same
 * default mapcn.dev ships. Raster (not vector) on purpose: a vector style is a
 * ~30 KB JSON plus glyph and sprite fetches, and all we need is a dim backdrop
 * behind our own pins.
 *
 * "dark_nolabels" rather than the labelled variant because SkyGuide's canvas is
 * pure black and CARTO's label typography is not Satoshi — place names would
 * read as someone else's design leaking into ours. Country/city context comes
 * from the pins and the observer cards instead.
 *
 * Attribution is required by both CARTO and OpenStreetMap and is rendered by
 * MapLibre's own attribution control — do not remove it.
 */

const CARTO_DARK_TILES = [
  "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
  "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
  "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
  "https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
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
    carto: {
      type: "raster",
      tiles: CARTO_DARK_TILES,
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
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
      id: "carto-dark",
      type: "raster",
      source: "carto",
      paint: {
        // Knock the basemap back so our accent pins are the brightest thing on
        // it — the map is context, the observers are the content.
        "raster-opacity": 0.72,
        "raster-saturation": -0.3,
      },
    },
  ],
};
