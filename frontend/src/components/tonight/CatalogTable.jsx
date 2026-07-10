import { useMemo, useState } from "react";

import {
  compassPoint,
  formatDegrees,
  formatDistance,
  formatMagnitude,
  scoreColor,
  typeKey,
  typeMeta,
  TYPE_META,
} from "./vocabulary";

/**
 * The Deep-Sky Ledger — the full catalog as a dense, filterable, sortable
 * research table. Live geometry (score, alt/az) is merged in for objects
 * above the horizon; the rest can be shown with the "below horizon" toggle.
 * Clicking a row opens the object dossier.
 */

const COLUMNS = [
  { key: "catalog_id", label: "ID", sortable: true },
  { key: "name", label: "Name", sortable: true },
  { key: "object_type", label: "Type", sortable: true },
  { key: "constellation", label: "Const.", sortable: true },
  { key: "magnitude", label: "Mag", sortable: true, numeric: true },
  { key: "angular_size_arcmin", label: "Size ′", sortable: true, numeric: true },
  { key: "distance_ly", label: "Distance", sortable: true, numeric: true },
  { key: "altitude_deg", label: "Alt", sortable: true, numeric: true },
  { key: "azimuth_deg", label: "Az", sortable: true, numeric: true },
  { key: "visibility_score", label: "Score", sortable: true, numeric: true },
];

function compare(a, b, key, direction) {
  const av = a[key];
  const bv = b[key];
  // Nulls always sink to the bottom regardless of direction.
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  const result =
    typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
  return direction === "asc" ? result : -result;
}

export default function CatalogTable({ targets, belowHorizon, onSelect }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [showBelow, setShowBelow] = useState(false);
  const [sort, setSort] = useState({ key: "visibility_score", direction: "desc" });

  const rows = useMemo(() => {
    const pool = showBelow ? [...targets, ...belowHorizon] : targets;
    const q = query.trim().toLowerCase();
    const filtered = pool.filter((row) => {
      if (type !== "all" && typeKey(row.object_type) !== type) return false;
      if (!q) return true;
      return [row.catalog_id, row.name, row.constellation, ...(row.aliases || [])]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q));
    });
    return [...filtered].sort((a, b) => compare(a, b, sort.key, sort.direction));
  }, [targets, belowHorizon, query, type, showBelow, sort]);

  const onHeaderClick = (column) => {
    if (!column.sortable) return;
    setSort((prev) =>
      prev.key === column.key
        ? { key: column.key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key: column.key, direction: column.numeric ? "desc" : "asc" },
    );
  };

  return (
    <section data-reveal className="mx-auto w-full max-w-7xl px-6 sm:px-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#FF8C1A]">
            The Deep-Sky Ledger
          </p>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Full catalog, live geometry
          </h2>
        </div>
        <p className="text-xs text-[#6B7280]">
          {rows.length} object{rows.length === 1 ? "" : "s"} shown
        </p>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, ID, alias, constellation…"
          className="w-full max-w-xs rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-[#6B7280] outline-none backdrop-blur-3xl transition-colors focus:border-[#FF8C1A]/60"
        />
        <div className="flex flex-wrap gap-1.5">
          {["all", ...Object.keys(TYPE_META).filter((k) => k !== "other")].map(
            (key) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-300 ${
                  type === key
                    ? "border-[#FF8C1A]/50 bg-[#FF8C1A]/15 text-[#FF8C1A]"
                    : "border-white/10 bg-white/5 text-[#AAB4C5] hover:bg-white/10"
                }`}
              >
                {key === "all" ? "All types" : TYPE_META[key].label}
              </button>
            ),
          )}
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-[#AAB4C5]">
          <input
            type="checkbox"
            checked={showBelow}
            onChange={(e) => setShowBelow(e.target.checked)}
            className="h-3.5 w-3.5 accent-[#FF8C1A]"
          />
          Include below-horizon
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-3xl">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.15em] text-[#6B7280]">
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  onClick={() => onHeaderClick(column)}
                  className={`px-4 py-3 font-medium ${
                    column.sortable
                      ? "cursor-pointer select-none transition-colors hover:text-[#FF8C1A]"
                      : ""
                  }`}
                >
                  {column.label}
                  {sort.key === column.key && (
                    <span className="ml-1 text-[#FF8C1A]">
                      {sort.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const visible = row.visibility_score != null;
              return (
                <tr
                  key={row.catalog_id}
                  onClick={() => onSelect?.(row.catalog_id)}
                  className={`cursor-pointer border-b border-white/5 transition-colors duration-200 hover:bg-white/10 ${
                    visible ? "" : "opacity-45"
                  }`}
                >
                  <td className="px-4 py-2.5 font-semibold text-[#FF8C1A]">
                    {row.catalog_id}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-2.5 text-white">
                    {row.name || <span className="text-[#6B7280]">unnamed</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[#AAB4C5]">
                    <span className="mr-1.5 text-[#FB923C]">
                      {typeMeta(row.object_type).symbol}
                    </span>
                    {row.object_type || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[#AAB4C5]">
                    {row.constellation || "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-[#AAB4C5]">
                    {formatMagnitude(row.magnitude)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-[#AAB4C5]">
                    {row.angular_size_arcmin?.toFixed(1) ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[#AAB4C5]">
                    {formatDistance(row.distance_ly)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-white">
                    {formatDegrees(row.altitude_deg)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[#AAB4C5]">
                    {row.azimuth_deg != null
                      ? `${Math.round(row.azimuth_deg)}° ${compassPoint(row.azimuth_deg)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {visible ? (
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${row.visibility_score}%`,
                              background: scoreColor(row.visibility_score),
                            }}
                          />
                        </span>
                        <span className="tabular-nums text-white">
                          {row.visibility_score}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-[#6B7280]">set</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-4 py-10 text-center text-sm text-[#6B7280]"
                >
                  Nothing matches — clear the search or include below-horizon
                  objects.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
