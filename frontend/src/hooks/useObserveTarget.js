import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { usePairingMaybe } from "../context/PairingContext";

/**
 * The one way to start observing a target, shared by every "Observe" button
 * (TargetHero, RecommendedCard, chat actions).
 *
 * Takes the SHORTEST path to guidance: phone already paired -> straight to
 * /alignment with the target pre-set (the workspace aims the engine itself);
 * otherwise -> the dashboard's guided flow, which walks telescope -> pairing
 * and then hands off to /alignment carrying the target along.
 *
 * Safe outside PairingProvider (landing-page chat): no provider simply means
 * "not paired", so the guided flow is used.
 */
export function useObserveTarget() {
  const navigate = useNavigate();
  const pairingCtx = usePairingMaybe();
  const paired = pairingCtx?.pairing?.status === "connected";

  return useCallback(
    (catalogId) => {
      const id = String(catalogId || "").toUpperCase();
      if (!id) return;
      navigate(
        paired
          ? `/alignment?target=${encodeURIComponent(id)}`
          : `/dashboard?observe=${encodeURIComponent(id)}`,
      );
    },
    [navigate, paired],
  );
}
