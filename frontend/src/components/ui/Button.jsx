import { motion } from "framer-motion";

/**
 * Reusable button system for SkyGuide AI (redesign v2.0 "Bento / Electric Blue").
 *
 * One accent — electric blue #0049CD (hover #1E63FF). Flat surfaces, hairline
 * borders, radius 0 (enforced globally). Never introduce other accent hues —
 * add a variant here instead.
 */

const base =
  "inline-flex items-center justify-center gap-2 font-semibold " +
  "transition-colors focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary: "bg-accent text-ink hover:bg-accent-hi active:bg-accent",
  secondary: "border border-line bg-surface-2 text-ink hover:bg-surface-3",
  danger: "bg-danger text-ink hover:bg-danger/90 active:bg-danger",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
};

const sizes = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
  icon: "p-2 text-base",
};

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function Button({
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  disabled = false,
  className,
  children,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      whileHover={!isDisabled ? { scale: 1.03 } : undefined}
      whileTap={!isDisabled ? { scale: 0.97 } : undefined}
      className={cx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
      )}
      {children}
    </motion.button>
  );
}
