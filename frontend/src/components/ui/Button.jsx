import { motion } from "framer-motion";

/**
 * Reusable button system for SkyGuide AI.
 *
 * One standardized accent (Tailwind orange, which maps exactly to the brand
 * palette): base #F97316, hover #FB923C, pressed #EA580C. Never introduce
 * other orange shades for buttons — use a variant here instead.
 */

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold " +
  "transition-colors focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-orange-500/40 disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary: "bg-orange-500 text-white hover:bg-orange-400 active:bg-orange-600",
  secondary: "border border-white/10 bg-white/5 text-white hover:bg-white/10",
  danger: "bg-red-500 text-white hover:bg-red-400 active:bg-red-600",
  ghost: "text-[#AAB4C5] hover:bg-white/5 hover:text-white",
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
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      )}
      {children}
    </motion.button>
  );
}
