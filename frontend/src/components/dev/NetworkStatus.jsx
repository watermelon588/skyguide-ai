import { getNetworkInfo } from "../../config/network";

/**
 * Developer-only network inspector.
 *
 * Renders nothing in production (tree-shaken via `import.meta.env.DEV`). In
 * development it shows the resolved network mode and every URL the app derives
 * from the config layer — so you can confirm at a glance that QR / Socket /
 * REST all point at the LAN IP or tunnel you expect. Uses a native <details>
 * element for collapse so it holds no React state.
 */

const MODE_TONE = {
  local: { text: "text-[#AAB4C5]", dot: "bg-[#6B7280]" },
  lan: { text: "text-[#22C55E]", dot: "bg-[#22C55E]" },
  tunnel: { text: "text-orange-400", dot: "bg-orange-400" },
  production: { text: "text-orange-400", dot: "bg-orange-400" },
};

function Row({ label, value }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-16 shrink-0 text-[10px] uppercase tracking-wide text-[#6B7280]">
        {label}
      </span>
      <span className="truncate font-mono text-[11px] text-white">
        {value || "—"}
      </span>
    </div>
  );
}

export default function NetworkStatus() {
  if (!import.meta.env.DEV) return null;

  const info = getNetworkInfo();
  const tone = MODE_TONE[info.mode] ?? MODE_TONE.local;

  return (
    <details className="fixed bottom-3 left-3 z-[60] w-[300px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-white/10 bg-[#0B0D12]/90 shadow-2xl backdrop-blur-xl">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-semibold text-white select-none">
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
        <span className="text-[#6B7280]">Network</span>
        <span className={`uppercase ${tone.text}`}>{info.mode}</span>
      </summary>
      <div className="space-y-1.5 border-t border-white/10 px-3 py-2.5">
        <Row label="Frontend" value={info.frontendUrl} />
        <Row label="API" value={info.apiUrl} />
        <Row label="Socket" value={info.socketUrl} />
        <Row label="QR" value={info.qrUrl} />
        <Row label="Astro" value={info.astroUrl} />
        <Row label="Origin" value={info.origin} />
      </div>
    </details>
  );
}
