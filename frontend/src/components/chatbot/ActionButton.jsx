import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck, FiArrowRight, FiPlus, FiCrosshair } from "react-icons/fi";

import { useObserveTarget } from "../../hooks/useObserveTarget";
import { useObservations } from "../../hooks/useObservations";
import { useAuth } from "../../context/AuthContext";

/**
 * One executable chat action — the button under an Astro reply.
 *
 * The action arrived from the LLM, but it was validated against the gateway's
 * allowlist before reaching this component, and NOTHING here runs until the
 * user clicks. Execution goes through the exact same paths the rest of the
 * app uses: navigate for pages, useObserveTarget for guidance, the planner
 * mutation for "add to plan" — the chat gets no special powers.
 */

const ICONS = {
  navigate: FiArrowRight,
  observe: FiCrosshair,
  plan: FiPlus,
};

export default function ActionButton({ action }) {
  const navigate = useNavigate();
  const observeTarget = useObserveTarget();
  const { isAuthenticated } = useAuth();
  const { add, plannedByCatalogId } = useObservations({
    enabled: isAuthenticated,
  });

  // "done" latches for plan (a mutation); navigations move the page anyway.
  const [done, setDone] = useState(false);

  const alreadyPlanned =
    action.type === "plan" && plannedByCatalogId?.has(action.target);

  const run = () => {
    if (action.type === "navigate") {
      navigate(action.to);
    } else if (action.type === "observe") {
      observeTarget(action.target);
    } else if (action.type === "plan") {
      if (!isAuthenticated || alreadyPlanned || add.isPending) return;
      add.mutate(
        { catalog_id: action.target },
        { onSuccess: () => setDone(true) },
      );
    }
  };

  // A plan button for a signed-out user (landing-page chat) would only fail —
  // point them at sign-in instead of rendering a dead control.
  if (action.type === "plan" && !isAuthenticated) {
    return (
      <button
        type="button"
        onClick={() => navigate("/login")}
        className="inline-flex items-center gap-1.5 border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
      >
        <FiArrowRight className="text-sm" />
        Sign in to plan {action.target}
      </button>
    );
  }

  const Icon = done || alreadyPlanned ? FiCheck : (ICONS[action.type] ?? FiArrowRight);
  const label =
    done ? "Added" : alreadyPlanned ? `${action.target} already planned` : action.label;

  return (
    <button
      type="button"
      onClick={run}
      disabled={done || alreadyPlanned || add.isPending}
      className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default ${
        done || alreadyPlanned
          ? "border-success/40 bg-success/10 text-success"
          : "border-accent/40 bg-accent/10 text-accent-hi hover:bg-accent/20"
      }`}
    >
      <Icon className="text-sm" />
      {add.isPending && action.type === "plan" ? "Adding…" : label}
    </button>
  );
}
