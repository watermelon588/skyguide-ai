import { Link } from "react-router-dom";
import { ArrowLeft, Telescope } from "lucide-react";

import { useCatalogStats } from "../hooks/useCatalog";
import StatTiles from "../components/explore/StatTiles";
import CatalogCharts from "../components/explore/CatalogCharts";
import ExploreSkyChart from "../components/explore/ExploreSkyChart";
import CatalogBrowser from "../components/explore/CatalogBrowser";

/**
 * Explore — the whole ~13k-object catalog, made legible.
 *
 * /tonight shows the night's best hundred; this is where the full dataset lives,
 * so it leads with visualizations (what's out there, how bright, where the sky
 * is busiest) to give shape to a number too big to scroll, then a filterable,
 * paginated table underneath. Stats come pre-aggregated from the engine; the
 * table pages server-side. Nothing here ever loads all 13k at once.
 */
export default function Explore() {
  const { data: stats, isLoading, isError } = useCatalogStats();

  return (
    <div className="min-h-screen bg-bg px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="space-y-3">
          <Link
            to="/tonight"
            className="inline-flex items-center gap-1.5 text-xs text-ink-3 transition-colors hover:text-accent"
          >
            <ArrowLeft size={13} /> Back to tonight
          </Link>
          <div className="flex items-center gap-3">
            <Telescope className="text-accent" size={26} />
            <div>
              <h1 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">
                Explore the Catalog
              </h1>
              <p className="mt-1 text-sm text-ink-2">
                Every deep-sky object SkyGuide knows — galaxies, clusters,
                nebulae and more, from the NGC, IC and Messier catalogs.
              </p>
            </div>
          </div>
        </header>

        {isLoading && (
          <div className="grid gap-3">
            <div className="h-28 animate-pulse border border-line bg-surface-2" />
            <div className="h-64 animate-pulse border border-line bg-surface-2" />
          </div>
        )}

        {isError && (
          <div className="border border-line bg-surface-2 p-8 text-center text-sm text-ink-3">
            Couldn't load the catalog statistics. The Astro Engine may be
            unreachable — try again shortly.
          </div>
        )}

        {stats && (
          <>
            <StatTiles stats={stats} />
            <CatalogCharts stats={stats} />
            <ExploreSkyChart />
            <CatalogBrowser stats={stats} />
          </>
        )}
      </div>
    </div>
  );
}
