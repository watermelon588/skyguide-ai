import axios from "axios";

import { getAstroApiBase } from "../config/network";

/**
 * Catalog data layer for the Explore page.
 *
 * The catalog is ~13k objects, so nothing here fetches it whole: `fetchStats`
 * gets server-computed aggregates for the charts (one small response), and
 * `fetchCatalogPage` pulls one filtered/sorted page for the table. Both hit the
 * FastAPI Astro Engine directly (public science data, no auth cookie), matching
 * tonight.service.
 */
const ASTRO_API = getAstroApiBase();

/**
 * Aggregate catalog statistics for the visualizations.
 * @returns {Promise<{total, named, with_image, by_catalog, by_type,
 *   by_constellation, by_magnitude}>}
 */
export const fetchStats = async () => {
  const response = await axios.get(`${ASTRO_API}/api/v1/catalog/stats`);
  return response.data.data;
};

/**
 * One page of the catalog, filtered server-side.
 * @param {{page?, limit?, type?, catalog?, constellation?, q?}} params
 * @returns {Promise<{objects: object[], pagination: object}>}
 */
export const fetchCatalogPage = async ({
  page = 1,
  limit = 50,
  type,
  catalog,
  constellation,
  q,
} = {}) => {
  const params = { page, limit };
  if (type && type !== "all") params.type = type;
  if (catalog && catalog !== "all") params.catalog = catalog;
  if (constellation && constellation !== "all") params.constellation = constellation;
  if (q?.trim()) params.q = q.trim();

  const response = await axios.get(`${ASTRO_API}/api/v1/catalog`, { params });
  return response.data.data;
};
