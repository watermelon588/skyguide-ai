import { Card } from "../ui/card";

/**
 * The Explore header's headline numbers. A stat tile is the right "chart" for a
 * single value (dataviz: not everything is a plot) — big number, quiet label.
 */

function Tile({ label, value, sub }) {
  return (
    <Card className="border-line bg-surface-2 p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-3">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-ink sm:text-4xl">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-ink-3">{sub}</p>}
    </Card>
  );
}

export default function StatTiles({ stats }) {
  const n = (v) => (v ?? 0).toLocaleString();
  const catalogs = Object.fromEntries(
    (stats.by_catalog ?? []).map((c) => [c.catalog, c.count]),
  );

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label="Objects"
        value={n(stats.total)}
        sub={`${n(catalogs.NGC)} NGC · ${n(catalogs.IC)} IC · ${n(catalogs.Messier)} Messier`}
      />
      <Tile
        label="With imagery"
        value={n(stats.with_image)}
        sub={`${Math.round((stats.with_image / stats.total) * 100)}% of the catalog`}
      />
      <Tile
        label="Named objects"
        value={n(stats.named)}
        sub="the rest go by their designation"
      />
      <Tile
        label="Constellations"
        value={n(stats.by_constellation?.length)}
        sub="all 88 of the sky"
      />
    </div>
  );
}
