import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import AuthShell, {
  AUTH_BUTTON_CLASS,
  AUTH_INPUT_CLASS,
} from "../components/auth/AuthShell";
import { resetPassword } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";

/**
 * /reset-password/:token — the page the reset email links to.
 *
 * New password + confirmation with a live strength hint; a successful reset
 * also logs the user in (the gateway sets the session cookie), so this lands
 * straight on the dashboard. Invalid/expired tokens get a clear dead-end
 * with a path to request a fresh link.
 */

function strengthOf(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { label: "weak", tone: "bg-red-400", width: "w-1/4" };
  if (score === 2) return { label: "okay", tone: "bg-yellow-400", width: "w-2/4" };
  if (score === 3) return { label: "good", tone: "bg-green-400", width: "w-3/4" };
  return { label: "strong", tone: "bg-green-400", width: "w-full" };
}

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState("idle"); // idle | saving | dead
  const [error, setError] = useState("");

  const strength = useMemo(() => strengthOf(password), [password]);
  const mismatch = confirm.length > 0 && confirm !== password;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (state === "saving") return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError("");
    setState("saving");
    try {
      const response = await resetPassword(token, password);
      // The gateway logged us in with the response — sync the context and go.
      if (response.user) setUser(response.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || "";
      if (err.response?.status === 400) {
        setState("dead"); // invalid or expired token — form is pointless now
      } else {
        setState("idle");
        setError(message || "Couldn't reach the server — please try again.");
      }
    }
  };

  if (state === "dead") {
    return (
      <AuthShell heading="Link expired" sub="Reset links live for 10 minutes">
        <div className="space-y-5 text-center">
          <p className="rounded-md border border-red-400/20 bg-red-900/50 px-4 py-3 text-sm text-red-100">
            This reset link is invalid or has expired.
          </p>
          <Link
            to="/forgot-password"
            className="block text-sm font-semibold text-white hover:underline"
          >
            Request a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell heading="Set a new password" sub="Minimum 8 characters">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            required
            autoFocus
            className={AUTH_INPUT_CLASS}
          />
          {strength && (
            <div className="mt-2 flex items-center gap-3">
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className={`block h-full rounded-full transition-all duration-300 ${strength.tone} ${strength.width}`}
                />
              </span>
              <span className="w-12 text-right text-xs text-gray-400">
                {strength.label}
              </span>
            </div>
          )}
        </div>

        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          required
          className={`${AUTH_INPUT_CLASS} ${
            mismatch ? "border-red-400/60" : ""
          }`}
        />
        {mismatch && (
          <p className="text-xs text-red-300">Passwords don't match yet.</p>
        )}

        {error && (
          <p className="rounded-md border border-red-400/20 bg-red-900/60 px-4 py-2 text-sm text-red-100">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={state === "saving" || mismatch}
          className={AUTH_BUTTON_CLASS}
        >
          {state === "saving" ? "Saving…" : "Reset password & sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
