import { useState } from "react";
import { Link } from "react-router-dom";

import AuthShell, {
  AUTH_BUTTON_CLASS,
  AUTH_INPUT_CLASS,
} from "../components/auth/AuthShell";
import { forgotPassword } from "../services/auth.service";

/**
 * /forgot-password — request a reset link.
 *
 * The success copy is identical whether or not the account exists (the
 * gateway answers generically too), so this page can never be used to probe
 * which emails have accounts.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error

  const onSubmit = async (e) => {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    try {
      await forgotPassword(email.trim());
      setState("sent");
    } catch {
      // Only infrastructure failures land here (the gateway 200s unknown
      // emails) — worth telling the user to retry.
      setState("error");
    }
  };

  return (
    <AuthShell
      heading="Forgot password"
      sub="We'll email you a reset link"
    >
      {state === "sent" ? (
        <div className="space-y-5 text-center">
          <p className="rounded-md border border-green-400/20 bg-green-900/40 px-4 py-3 text-sm text-green-100">
            If that account exists, a reset link is on its way to{" "}
            <span className="font-semibold">{email}</span>. It expires in 10
            minutes.
          </p>
          <Link
            to="/login"
            className="block text-sm font-semibold text-white hover:underline"
          >
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            required
            autoFocus
            className={AUTH_INPUT_CLASS}
          />
          {state === "error" && (
            <p className="rounded-md border border-red-400/20 bg-red-900/60 px-4 py-2 text-sm text-red-100">
              Couldn't reach the server — please try again.
            </p>
          )}
          <button
            type="submit"
            disabled={state === "sending"}
            className={AUTH_BUTTON_CLASS}
          >
            {state === "sending" ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-center text-sm text-gray-400">
            Remembered it?{" "}
            <Link to="/login" className="font-semibold text-white hover:underline">
              Login
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
