import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "../ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

/**
 * The Explore visualizations. Every chart here is a single series (a count), so
 * per the dataviz method there is exactly one hue — the brand's electric blue —
 * no legend, no categorical palette to CVD-check. Text stays in ink tokens; the
 * grid and axes are recessive; each bar carries a hover tooltip.
 *
 * The one deliberate second colour is the muted "no data" magnitude bin: it is
 * not a real brightness band, so it reads as absent rather than as the darkest
 * bucket.
 */

const ACCENT = "#0049CD";
const ACCENT_HI = "#1E63FF";
const MUTED = "#3A3B40";
const AXIS = "#6B6C70";
const GRID = "#232427";

const axisProps = {
  stroke: AXIS,
  tick: { fill: AXIS, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: GRID },
};

function ChartCard({ title, hint, children, className = "" }) {
  return (
    <Card className={`border-line bg-surface-2 p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
      </div>
      {children}
    </Card>
  );
}

const config = { count: { label: "Objects", color: ACCENT } };

/** Object-type distribution — vertical bars, biggest first. */
function TypeChart({ data }) {
  const top = data.slice(0, 8);
  return (
    <ChartCard title="What's out there" hint="Objects by type (top 8)">
      <ChartContainer config={config} className="h-[240px] w-full">
        <BarChart data={top} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="type"
            {...axisProps}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={70}
            tickFormatter={(t) => (t.length > 12 ? `${t.slice(0, 11)}…` : t)}
          />
          <YAxis {...axisProps} width={44} tickFormatter={(v) => v.toLocaleString()} />
          <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "#17181B" }} />
          <Bar dataKey="count" fill={ACCENT} radius={0} maxBarSize={48} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

/** Magnitude histogram — brightness left (bright) to right (faint). */
function MagnitudeChart({ data }) {
  return (
    <ChartCard
      title="How bright, how faint"
      hint="Objects by visual magnitude — brighter on the left"
    >
      <ChartContainer config={config} className="h-[240px] w-full">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="bin" {...axisProps} interval={0} angle={-30} textAnchor="end" height={54} />
          <YAxis {...axisProps} width={44} tickFormatter={(v) => v.toLocaleString()} />
          <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "#17181B" }} />
          <Bar dataKey="count" radius={0} maxBarSize={48} isAnimationActive={false}>
            {data.map((d) => (
              // "no data" isn't a brightness band — mute it so it doesn't read
              // as the faintest bin.
              <Cell key={d.bin} fill={d.bin === "no data" ? MUTED : ACCENT} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

/** Richest constellations — horizontal bars, most-populous first. */
function ConstellationChart({ data }) {
  const top = data.slice(0, 12);
  return (
    <ChartCard
      title="Where the sky is busiest"
      hint="Objects per constellation (top 12)"
      className="lg:col-span-2"
    >
      <ChartContainer config={config} className="h-[320px] w-full">
        <BarChart
          data={top}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" {...axisProps} tickFormatter={(v) => v.toLocaleString()} />
          <YAxis
            type="category"
            dataKey="constellation"
            {...axisProps}
            width={120}
            interval={0}
          />
          <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "#17181B" }} />
          <Bar dataKey="count" fill={ACCENT_HI} radius={0} maxBarSize={22} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

export default function CatalogCharts({ stats }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <TypeChart data={stats.by_type ?? []} />
      <MagnitudeChart data={stats.by_magnitude ?? []} />
      <ConstellationChart data={stats.by_constellation ?? []} />
    </div>
  );
}
