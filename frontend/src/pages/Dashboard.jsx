import { useMemo, useState } from "react";
import LocationPermissionModal from "../components/dashboard/LocationPermissionModal";
import ManualLocationModal from "../components/dashboard/ManualLocationModal";
import ObserverCard from "../components/dashboard/ObserverCard";
import TelescopeCard from "../components/dashboard/TelescopeCard";
import SyncTelescopeCard from "../components/dashboard/SyncTelescopeCard";
import { useLocation } from "../hooks/useLocation";
import { getObserverLocation } from "../utils/location";
import { PairingProvider } from "../context/PairingContext";

export default function Dashboard() {
  const { user, hasLocation } = useLocation();

  // Lets the user postpone the first-run permission modal for this session.
  const [dismissedModal, setDismissedModal] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const showPermissionModal = !hasLocation && !dismissedModal && !manualOpen;

  // Prefill manual entry with the saved location when editing.
  // Memoized so its identity is stable across renders (the modal's reset
  // effect depends on it — a fresh object each render would wipe input).
  const { latitude, longitude, timezone } = getObserverLocation(user);
  const manualInitial = useMemo(
    () => (hasLocation ? { latitude, longitude, timezone } : undefined),
    [hasLocation, latitude, longitude, timezone],
  );

  return (
    <PairingProvider>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        {hasLocation && <ObserverCard onEdit={() => setManualOpen(true)} />}
        <TelescopeCard />
        <SyncTelescopeCard />
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
    </PairingProvider>
  );
}
