import astronautImg from "../assets/bg/login.png";

/**
 * Shared image assets.
 *
 * This used to import all 18 background images into an `assets` array, of which
 * exactly one — `assets[16]`, the astronaut — was ever read (by ChatWidget and
 * ChatWindow). Vite bundles what is imported, so the other 17 shipped in every
 * build for nothing. The unused originals now live in `_local/assets/`.
 *
 * Exported by NAME rather than by index: `assets[16]` silently pointed at a
 * different picture the moment anything above it in the list changed.
 */
export const astronaut = astronautImg;
