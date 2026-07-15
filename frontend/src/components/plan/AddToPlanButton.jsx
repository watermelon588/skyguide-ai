import { motion } from "framer-motion";
import { Check, Plus } from "lucide-react";

import { useObservations } from "../../hooks/useObservations";

/**
 * The one way anything gets onto the observation plan.
 *
 * Shared across the /tonight drawer, the Deep-Sky Ledger rows and the
 * dashboard's top-5 — one component so the on-plan state, optimistic add and
 * double-tap guard stay identical everywhere. Reads the shared
 * useObservations query (React Query dedupes, so N buttons = 1 request).
 *
 * variant "chip"  — compact, for dense rows
 * variant "full"  — labeled button, for the object drawer
 */
export default function AddToPlanButton({
  catalogId,
  variant = "chip",
  className = "",
}) {
  const { plannedByCatalogId, add, isLoading } = useObservations();

  const onPlan = plannedByCatalogId.has(catalogId);
  const busy = add.isPending || isLoading;

  const onClick = (event) => {
    // Rows and drawers have their own click handlers — never trigger them.
    event.stopPropagation();
    if (onPlan || busy) return;
    add.mutate({ catalog_id: catalogId });
  };

  if (variant === "full") {
    return (
      <motion.button
        type="button"
        whileHover={onPlan ? undefined : { scale: 1.03 }}
        whileTap={onPlan ? undefined : { scale: 0.97 }}
        onClick={onClick}
        disabled={onPlan || busy}
        aria-label={
          onPlan ? `${catalogId} is on your plan` : `Add ${catalogId} to plan`
        }
        className={`flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors duration-300 ${
          onPlan
            ? "cursor-default border border-success/30 bg-success/10 text-success"
            : "bg-accent text-ink hover:bg-accent-hi disabled:opacity-60"
        } ${className}`}
      >
        {onPlan ? <Check size={15} /> : <Plus size={15} />}
        {onPlan ? "On your plan" : "Add to plan"}
      </motion.button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={onPlan || busy}
      title={onPlan ? "On your plan" : "Add to plan"}
      aria-label={
        onPlan ? `${catalogId} is on your plan` : `Add ${catalogId} to plan`
      }
      className={`flex h-7 w-7 shrink-0 items-center justify-center border transition-colors duration-300 ${
        onPlan
          ? "cursor-default border-success/30 bg-success/10 text-success"
          : "border-line bg-surface-2 text-ink-2 hover:border-accent hover:text-accent"
      } ${className}`}
    >
      {onPlan ? <Check size={13} /> : <Plus size={13} />}
    </button>
  );
}
