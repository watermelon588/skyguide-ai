import CountUp from "./fx/CountUp";
import SpotlightCard from "./fx/SpotlightCard";

/**
 * The "mission readout" — six live numbers that summarize tonight's sky at a
 * glance. Values count up as the strip scrolls into view.
 */
export default function StatStrip({ targets, moon, conditions }) {
  const topScore = targets.length ? targets[0].visibility_score : null;
  const galaxies = targets.filter((t) =>
    (t.object_type || "").toLowerCase().includes("galaxy"),
  ).length;

  const stats = [
    {
      label: "Objects visible",
      value: targets.length,
      detail: "above your horizon now",
    },
    {
      label: "Top score",
      value: topScore,
      suffix: "",
      detail: targets.length
        ? `${targets[0].name || targets[0].catalog_id}`
        : "no targets",
    },
    {
      label: "Moon illumination",
      value: moon?.illumination ?? null,
      suffix: "%",
      decimals: 1,
      detail: moon?.phase ?? "—",
    },
    {
      label: "Observing score",
      value: conditions?.observing_score ?? null,
      suffix: "",
      detail: conditions?.observing_quality
        ? `sky rated ${conditions.observing_quality.toLowerCase()}`
        : "—",
    },
    {
      label: "Cloud cover",
      value: conditions?.cloud_cover_percent ?? null,
      suffix: "%",
      detail: conditions?.cloud_rating
        ? `${conditions.cloud_rating.toLowerCase()} skies`
        : "—",
    },
    {
      label: "Galaxies up",
      value: galaxies,
      detail: "island universes in reach",
    },
  ];

  return (
    <section
      data-reveal-group
      className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-4 px-6 sm:px-12 md:grid-cols-3 xl:grid-cols-6"
    >
      {stats.map((stat) => (
        <SpotlightCard key={stat.label} data-reveal className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#6B7280]">
            {stat.label}
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            <CountUp
              value={stat.value}
              suffix={stat.suffix || ""}
              decimals={stat.decimals || 0}
            />
          </p>
          <p className="mt-1 truncate text-xs text-[#AAB4C5]">{stat.detail}</p>
        </SpotlightCard>
      ))}
    </section>
  );
}
