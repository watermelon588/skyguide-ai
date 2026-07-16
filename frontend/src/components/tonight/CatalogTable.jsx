import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import AddToPlanButton from "../plan/AddToPlanButton";
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
 * The Deep-Sky Ledger — tonight's top-ranked targets as a dense, filterable,
 * sortable table with live geometry (score, alt/az, set times). This is the
 * night's best hundred, not the whole catalog: the full ~13k-object dataset
 * lives on the Explore page, linked from the header. Clicking a row opens the
 * object dossier.
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
  { key: "plan", label: "Plan", sortable: false },
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

export default function CatalogTable({ targets, onSelect }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState({ key: "visibility_score", direction: "desc" });

  const rows = useMemo(() => {
    const pool = targets;
    const q = query.trim().toLowerCase();
    const filtered = pool.filter((row) => {
      if (type !== "all" && typeKey(row.object_type) !== type) return false;
      if (!q) return true;
      return [row.catalog_id, row.name, row.constellation, ...(row.aliases || [])]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q));
    });
    return [...filtered].sort((a, b) => compare(a, b, sort.key, sort.direction));
  }, [targets, query, type, sort]);

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
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
            The Deep-Sky Ledger
          </p>
          <h2 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">
            Tonight's top targets, live
          </h2>
        </div>
        <Link
          to="/explore"
          className="group inline-flex items-center gap-2 border border-line bg-surface-2 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Explore all 13,000+ objects
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, ID, alias, constellation…"
          className="w-full max-w-xs border border-line bg-surface-2 px-4 py-2 text-sm text-ink placeholder-ink-3 outline-none transition-colors focus:border-accent"
        />
        <div className="flex flex-wrap gap-1.5">
          {["all", ...Object.keys(TYPE_META).filter((k) => k !== "other")].map(
            (key) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`border px-3 py-1.5 text-xs font-medium transition-colors duration-300 ${
                  type === key
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-line bg-surface-2 text-ink-2 hover:bg-surface-3"
                }`}
              >
                {key === "all" ? "All types" : TYPE_META[key].label}
              </button>
            ),
          )}
        </div>
        <p className="ml-auto text-xs text-ink-3">
          {rows.length} shown · <Link to="/explore" className="text-accent hover:underline">browse all →</Link>
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-line bg-surface-2">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-[0.15em] text-ink-3">
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  onClick={() => onHeaderClick(column)}
                  className={`px-4 py-3 font-medium ${
                    column.sortable
                      ? "cursor-pointer select-none transition-colors hover:text-accent"
                      : ""
                  }`}
                >
                  {column.label}
                  {sort.key === column.key && (
                    <span className="ml-1 text-accent">
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
                  className={`cursor-pointer border-b border-line transition-colors duration-200 hover:bg-surface-3 ${
                    visible ? "" : "opacity-45"
                  }`}
                >
                  <td className="px-4 py-2.5 font-semibold text-accent">
                    {row.catalog_id}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-2.5 text-ink">
                    {row.name || <span className="text-ink-3">unnamed</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-2">
                    <span className="mr-1.5 text-accent">
                      {typeMeta(row.object_type).symbol}
                    </span>
                    {row.object_type || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-ink-2">
                    {row.constellation || "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-ink-2">
                    {formatMagnitude(row.magnitude)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-ink-2">
                    {row.angular_size_arcmin?.toFixed(1) ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-ink-2">
                    {formatDistance(row.distance_ly)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-ink">
                    {formatDegrees(row.altitude_deg)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-ink-2">
                    {row.azimuth_deg != null
                      ? `${Math.round(row.azimuth_deg)}° ${compassPoint(row.azimuth_deg)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {visible ? (
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-14 overflow-hidden bg-surface-3">
                          <span
                            className="block h-full"
                            style={{
                              width: `${row.visibility_score}%`,
                              background: scoreColor(row.visibility_score),
                            }}
                          />
                        </span>
                        <span className="tabular-nums text-ink">
                          {row.visibility_score}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-ink-3">set</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <AddToPlanButton catalogId={row.catalog_id} />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-4 py-10 text-center text-sm text-ink-3"
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
