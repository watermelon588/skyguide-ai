import { useState } from "react";
import { motion } from "framer-motion";
import { MailCheck } from "lucide-react";

import AuthShell, { authInputClass } from "../components/auth/AuthShell";
import { forgotPassword } from "../services/auth.service";

/**
 * Request a password-reset link.
 *
 * The confirmation is deliberately the SAME whether or not the address has an
 * account. The gateway answers identically by design (so the endpoint can't be
 * used to discover which emails are registered) and this screen must not undo
 * that by rendering a different state for "unknown email" — there is nothing to
 * render it from, and inventing one would reintroduce the leak.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      // Only transport/rate-limit failures land here — a valid request always
      // succeeds, including for addresses that don't exist.
      setError(
        err.response?.data?.message ||
          "We couldn't send that just now. Please try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="If that address has an account, a reset link is on its way."
      >
        <div className="mt-6 border border-line bg-surface-2 p-5">
          <MailCheck size={20} className="text-accent" />
          <p className="mt-3 text-sm text-ink-2">
            We sent a reset link to{" "}
            <span className="font-semibold text-ink">{email}</span>.
          </p>
          <p className="mt-2 text-xs text-ink-3">
            The link expires in 10 minutes. Check your spam folder if it hasn't
            arrived in a minute.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSent(false);
            setError("");
          }}
          className="mt-6 text-sm font-semibold text-accent transition-colors duration-300 hover:text-accent-hi"
        >
          Use a different email
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your email and we'll send you a reset link."
    >
      {error && (
        <div
          role="alert"
          className="mt-6 border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger"
        >
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          type="email"
          name="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className={authInputClass}
        />

        <motion.button
          type="submit"
          disabled={loading || !email.trim()}
          whileHover={{ scale: loading ? 1 : 1.01 }}
          whileTap={{ scale: loading ? 1 : 0.99 }}
          className="w-full bg-accent py-3.5 font-semibold text-ink transition-colors duration-300 hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send reset link"}
        </motion.button>
      </form>
    </AuthShell>
  );
}
