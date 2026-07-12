import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Crosshair, MapPin } from "lucide-react";

import LocationPermissionModal from "../components/dashboard/LocationPermissionModal";
import ManualLocationModal from "../components/dashboard/ManualLocationModal";
import ObserverCard from "../components/dashboard/ObserverCard";
import TelescopeCard from "../components/dashboard/TelescopeCard";
import SyncTelescopeCard from "../components/dashboard/SyncTelescopeCard";
import OrientationPanelCard from "../components/dashboard/OrientationPanelCard";
import AlignmentPanelCard from "../components/dashboard/AlignmentPanelCard";
import WelcomeHeader from "../components/dashboard/WelcomeHeader";
import TonightGlance from "../components/dashboard/TonightGlance";
import PlannerCard from "../components/dashboard/PlannerCard";
import IssPassCard from "../components/dashboard/IssPassCard";
import MoonPanel from "../components/tonight/MoonPanel";
import ConditionsPanel from "../components/tonight/ConditionsPanel";
import SkyDome from "../components/tonight/SkyDome";
import Button from "../components/ui/Button";
import { useLocation } from "../hooks/useLocation";
import { useTelescope } from "../hooks/useTelescope";
import { useTonight } from "../hooks/useTonight";
import { getObserverLocation } from "../utils/location";
import { PairingProvider, usePairing } from "../context/PairingContext";

/**
 * The observatory workspace — IA v2 (product directive, Session 20).
 *
 * Order: greeting → observer location → telescope → tonight at a glance →
 * Moon → all-sky chart → conditions → observation plan → pairing/alignment
 * operations. Setup lives on top because nothing below it computes without
 * a location; the ops cards live at the bottom because the guided observe
 * flow scrolls the user there when they're the missing step.
 *
 * Guided observe flow: /dashboard?observe=<id> (from a Target Panel's
 * "Start observing") checks telescope → pairing → launch, highlighting and
 * scrolling to whichever section needs the user's attention, then auto-aims
 * the alignment engine and opens the overlay.
 */

const cell = {
  hidden: { opacity: 0, y: 14 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut", delay: 0.08 * i },
  }),
};

function SectionLabel({ children, hint }) {
  return (
    <div className="flex items-baseline gap-3 pt-2">
      <h2 className="shrink-0 text-[11px] font-medium uppercase tracking-[0.3em] text-[#6B7280]">
        {children}
      </h2>
      <span className="h-px flex-1 bg-white/10" />
      {hint && <span className="shrink-0 text-[11px] text-[#6B7280]">{hint}</span>}
    </div>
  );
}

/** Inline location slot for the no-location state — IA v2 puts it first. */
function LocationSetupCard({ onManual }) {
  const { status, detectAndSaveLocation } = useLocation();
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#FF8C1A]/25 bg-[#FF8C1A]/5 px-5 py-4 backdrop-blur-3xl">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FF8C1A]/25 bg-[#FF8C1A]/10 text-[#FF8C1A]">
        <MapPin size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">Set your observing location</p>
        <p className="text-xs text-[#AAB4C5]">
          Everything below — rankings, chart, Moon, conditions — is computed
          for your exact coordinates.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={detectAndSaveLocation}
          disabled={status === "requesting"}
        >
          {status === "requesting" ? "Locating…" : "Use GPS"}
        </Button>
        <Button variant="secondary" size="sm" onClick={onManual}>
          Enter manually
        </Button>
      </div>
    </div>
  );
}

/** Ring highlight for the section the observe flow needs attention on. */
function FlowSlot({ active, children }) {
  return (
    <div
      className={
        active
          ? "rounded-2xl ring-2 ring-[#FF8C1A]/70 ring-offset-2 ring-offset-[#090B12] transition-shadow"
          : undefined
      }
    >
      {children}
    </div>
  );
}

/**
 * Inner dashboard — must live under PairingProvider so the observe flow can
 * read pairing state and the alignment card can launch.
 */
function DashboardInner() {
  const navigate = useNavigate();
  const { user, hasLocation } = useLocation();
  const { hasTelescope, isLoading: telescopeLoading } = useTelescope();
  const pairing = usePairing();
  const tonight = useTonight();
  const [searchParams, setSearchParams] = useSearchParams();

  const [dismissedModal, setDismissedModal] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const showPermissionModal = !hasLocation && !dismissedModal && !manualOpen;

  const { latitude, longitude, timezone } = getObserverLocation(user);
  const manualInitial = useMemo(
    () => (hasLocation ? { latitude, longitude, timezone } : undefined),
    [hasLocation, latitude, longitude, timezone],
  );

  // ---- Guided observe flow -------------------------------------------
  const observeId = searchParams.get("observe")?.toUpperCase() || null;
  const paired = pairing.status === "connected";
  // Which step is the blocker? null while prerequisites are still loading.
  const flowStage = !observeId
    ? null
    : telescopeLoading
      ? "loading"
      : !hasTelescope
        ? "telescope"
        : !paired
          ? "sync"
          : "launch";

  useEffect(() => {
    if (flowStage !== "telescope" && flowStage !== "sync") return;
    const el = document.getElementById(
      flowStage === "telescope" ? "telescope-card" : "sync-card",
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [flowStage]);

  const clearFlow = () => setSearchParams({}, { replace: true });

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <WelcomeHeader />

        {/* Observe-flow banner: says why the user landed here and what's next. */}
        {observeId && flowStage !== "loading" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#FF8C1A]/30 bg-[#FF8C1A]/10 px-5 py-3"
          >
            <Crosshair size={16} className="shrink-0 text-[#FF8C1A]" />
            <p className="min-w-0 flex-1 text-sm text-white">
              Preparing to observe{" "}
              <span className="font-bold">{observeId}</span> —{" "}
              {flowStage === "telescope" &&
                "first, tell us about your telescope below."}
              {flowStage === "sync" &&
                "now pair your phone (it becomes the guidance sensor)."}
              {flowStage === "launch" && "opening guided alignment…"}
            </p>
            <button
              type="button"
              onClick={clearFlow}
              className="shrink-0 text-xs text-[#AAB4C5] transition-colors hover:text-white"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {/* 1 · Observer location — nothing works without it. */}
        <SectionLabel hint="the foundation of every calculation">
          Observer
        </SectionLabel>
        <div id="location-card">
          {hasLocation ? (
            <ObserverCard onEdit={() => setManualOpen(true)} />
          ) : (
            <LocationSetupCard onManual={() => setManualOpen(true)} />
          )}
        </div>

        {/* 2 · Telescope — configure now or later. */}
        <div id="telescope-card">
          <FlowSlot active={flowStage === "telescope"}>
            <TelescopeCard />
          </FlowSlot>
        </div>

        {hasLocation && (
          <>
            {/* 3–6 · Tonight at a glance / Moon / chart / conditions. */}
            <SectionLabel hint="refreshed every 5 minutes">
              Tonight at a glance
            </SectionLabel>
            <div className="grid gap-4 xl:grid-cols-3">
              <motion.div custom={0} variants={cell} initial="hidden" animate="show" className="min-w-0 xl:col-span-2">
                <TonightGlance
                  targets={tonight.targets}
                  moon={tonight.moon}
                  conditions={tonight.conditions}
                  isLoading={tonight.isLoading}
                  isError={tonight.isError}
                />
              </motion.div>
              <motion.div custom={1} variants={cell} initial="hidden" animate="show" className="min-w-0">
                {tonight.moon ? (
                  <MoonPanel moon={tonight.moon} />
                ) : (
                  <div className="h-full min-h-[200px] animate-pulse rounded-2xl border border-white/10 bg-white/5" />
                )}
              </motion.div>
              <motion.div custom={2} variants={cell} initial="hidden" animate="show" className="min-w-0 xl:col-span-2">
                <SkyDome
                  compact
                  targets={tonight.targets}
                  moon={tonight.moon}
                  onSelect={(id) => navigate(`/tonight/${id}`)}
                />
              </motion.div>
              <motion.div custom={3} variants={cell} initial="hidden" animate="show" className="min-w-0">
                {tonight.conditions ? (
                  <ConditionsPanel
                    weather={tonight.weather}
                    conditions={tonight.conditions}
                  />
                ) : (
                  <div className="h-full min-h-[200px] animate-pulse rounded-2xl border border-white/10 bg-white/5" />
                )}
              </motion.div>
              {/* 7 · The plan — every queued target links to its panel. */}
              <motion.div custom={4} variants={cell} initial="hidden" animate="show" className="min-w-0 xl:col-span-2">
                <PlannerCard
                  targets={tonight.targets}
                  catalogTotal={
                    tonight.targets.length + tonight.belowHorizon.length
                  }
                />
              </motion.div>
              <motion.div custom={5} variants={cell} initial="hidden" animate="show" className="min-w-0">
                <IssPassCard />
              </motion.div>
            </div>
          </>
        )}

        {/* 8 · Operations — pairing + alignment; the flow scrolls here. */}
        <SectionLabel hint="pairing · sensors · guidance">
          Telescope operations
        </SectionLabel>
        <div className="flex flex-col gap-4">
          <div id="sync-card">
            <FlowSlot active={flowStage === "sync"}>
              <SyncTelescopeCard />
            </FlowSlot>
          </div>
          <OrientationPanelCard />
          <AlignmentPanelCard
            launchTarget={flowStage === "launch" ? observeId : null}
            onLaunched={clearFlow}
          />
        </div>
      </div>

      <LocationPermissionModal
        open={showPermissionModal}
        onClose={() => setDismissedModal(true)}
        onLater={() => setDismissedModal(true)}
        onManual={() => setManualOpen(true)}
      />

      <ManualLocationModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        initial={manualInitial}
      />
    </>
  );
}

export default function Dashboard() {
  return (
    <PairingProvider>
      <DashboardInner />
    </PairingProvider>
  );
}
