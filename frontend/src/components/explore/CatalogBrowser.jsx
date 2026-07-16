import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { useCatalogBrowse } from "../../hooks/useCatalog";
import { typeMeta } from "../tonight/vocabulary";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";

/**
 * The full catalog as a filterable, paginated table — the "browse all ~13k"
 * surface. Filtering and paging happen SERVER-side (one page over the wire at a
 * time); the search box is debounced so a keystroke isn't a request. Every row
 * opens that object's Target Panel.
 */

const PAGE_SIZE = 50;
const fmtMag = (m) => (m == null ? "—" : m.toFixed(1));
const fmtSize = (s) => (s == null ? "—" : `${s.toFixed(1)}′`);

export default function CatalogBrowser({ stats }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [type, setType] = useState("all");
  const [catalog, setCatalog] = useState("all");
  const [constellation, setConstellation] = useState("all");
  const [page, setPage] = useState(1);

  // Debounce the search box. Resetting to page 1 happens in the (async) timeout
  // and in the filter handlers below — never synchronously in an effect body.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  // A filter change is meaningless on page 7 — jump back to the first page.
  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const { data, isFetching, isError } = useCatalogBrowse({
    page,
    limit: PAGE_SIZE,
    type,
    catalog,
    constellation,
    q: debouncedQ,
  });

  const rows = data?.objects ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.total_pages ?? 1;

  const typeOptions = useMemo(
    () => (stats?.by_type ?? []).map((t) => t.type).filter(Boolean),
    [stats],
  );
  const constellationOptions = useMemo(
    () => (stats?.by_constellation ?? []).map((c) => c.constellation).filter(Boolean),
    [stats],
  );

  const filterSelect = (value, onChange, label, options) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full border-line bg-surface-2 text-sm text-ink sm:w-44">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent className="max-h-72 border-line bg-surface-1 text-ink">
        <SelectItem value="all">{label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">Browse the catalog</h2>
          <p className="text-xs text-ink-3">
            {total.toLocaleString()} object{total === 1 ? "" : "s"} match your filters
          </p>
        </div>
      </div>

      {/* Filters — one row above the table, per the dataviz interaction spec. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, ID, alias…"
            className="border-line bg-surface-2 pl-9 text-sm text-ink placeholder:text-ink-3"
          />
        </div>
        {filterSelect(type, withReset(setType), "All types", typeOptions)}
        {filterSelect(catalog, withReset(setCatalog), "All catalogs", ["NGC", "IC", "Messier"])}
        {filterSelect(constellation, withReset(setConstellation), "All constellations", constellationOptions)}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-line bg-surface-2">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="text-ink-3">ID</TableHead>
              <TableHead className="text-ink-3">Name</TableHead>
              <TableHead className="text-ink-3">Type</TableHead>
              <TableHead className="text-ink-3">Constellation</TableHead>
              <TableHead className="text-right text-ink-3">Mag</TableHead>
              <TableHead className="text-right text-ink-3">Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o) => (
              <TableRow
                key={o.catalog_id}
                onClick={() => navigate(`/tonight/${encodeURIComponent(o.catalog_id)}`)}
                className="cursor-pointer border-line transition-colors hover:bg-surface-3"
              >
                <TableCell className="font-semibold text-accent">{o.catalog_id}</TableCell>
                <TableCell className="max-w-[200px] truncate text-ink">
                  {o.name || <span className="text-ink-3">unnamed</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-ink-2">
                  <span className="mr-1.5 text-accent">{typeMeta(o.object_type).symbol}</span>
                  {o.object_type || "—"}
                </TableCell>
                <TableCell className="text-ink-2">{o.constellation || "—"}</TableCell>
                <TableCell className="text-right tabular-nums text-ink-2">
                  {fmtMag(o.physical?.magnitude)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-ink-2">
                  {fmtSize(o.physical?.angular_size_arcmin)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-12 text-center text-sm text-ink-3">
                  {isError
                    ? "Couldn't load the catalog — check your connection."
                    : isFetching
                      ? "Loading…"
                      : "Nothing matches these filters."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4">
        <Badge variant="outline" className="border-line text-ink-3">
          Page {page} of {totalPages.toLocaleString()}
        </Badge>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isFetching}
            className="flex items-center gap-1 border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-3 disabled:opacity-40"
          >
            <ChevronLeft size={15} /> Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isFetching}
            className="flex items-center gap-1 border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-3 disabled:opacity-40"
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}
