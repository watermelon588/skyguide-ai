import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";

import AuthShell, { authInputClass } from "../components/auth/AuthShell";
import { resetPassword } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";

const MIN_PASSWORD_LENGTH = 8; // must match the User schema's minlength

/**
 * Set a new password from an emailed reset link (/reset-password/:token).
 *
 * On success the gateway issues a session cookie, so the observer lands signed
 * in — `checkAuth()` refreshes the context to pick that up before we navigate,
 * otherwise the dashboard would bounce them straight back to /login.
 */
export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    password.length >= MIN_PASSWORD_LENGTH && password === confirm && !loading;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    try {
      await resetPassword(token, password);
      // The reset response carries a fresh cookie; sync the context to it.
      await checkAuth();
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "That reset link is invalid or has expired.",
      );
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="New password"
      subtitle="Choose a new password for your account."
    >
      {error && (
        <div
          role="alert"
          className="mt-6 border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger"
        >
          {error}
          <div className="mt-2">
            <Link
              to="/forgot-password"
              className="font-semibold underline transition-colors hover:text-ink"
            >
              Request a new link
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <input
            type="password"
            name="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            className={authInputClass}
          />
          {tooShort && (
            <p className="mt-1.5 text-xs text-warning">
              Must be at least {MIN_PASSWORD_LENGTH} characters.
            </p>
          )}
        </div>

        <div>
          <input
            type="password"
            name="confirm"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className={authInputClass}
          />
          {mismatch && (
            <p className="mt-1.5 text-xs text-warning">
              Passwords don't match.
            </p>
          )}
        </div>

        <motion.button
          type="submit"
          disabled={!canSubmit}
          whileHover={{ scale: canSubmit ? 1.01 : 1 }}
          whileTap={{ scale: canSubmit ? 0.99 : 1 }}
          className="w-full bg-accent py-3.5 font-semibold text-ink transition-colors duration-300 hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Updating…" : "Set new password"}
        </motion.button>
      </form>
    </AuthShell>
  );
}
