import { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";

import { sendVerificationCode, verifyCode } from "../../services/auth.service";
import { useAuth } from "../../context/AuthContext";

/**
 * Enter the 6-digit email verification code.
 *
 * Shared by the post-sign-up step and the profile page, so "verify now" and
 * "verify later" are literally the same component — there's only one code path
 * to get right.
 *
 * Verification is never mandatory here: `onSkip` (when provided) lets the
 * observer straight into the app. They're already signed in either way.
 *
 * @param {string}   email          shown so the user knows where to look
 * @param {boolean}  codeAlreadySent  true after sign-up already mailed one
 * @param {Function} onVerified     called once verification succeeds
 * @param {Function} [onSkip]       renders a "skip for now" affordance
 */
export default function VerifyEmailPanel({
  email,
  codeAlreadySent = false,
  onVerified,
  onSkip,
}) {
  const { checkAuth } = useAuth();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    codeAlreadySent ? `We sent a 6-digit code to ${email}.` : "",
  );

  const submit = async (e) => {
    e?.preventDefault();
    if (code.length !== 6 || busy) return;

    setBusy(true);
    setError("");
    try {
      await verifyCode(code);
      await checkAuth(); // refresh the shared user so isVerified flips app-wide
      onVerified?.();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't verify that code.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setSending(true);
    setError("");
    setNotice("");
    try {
      const res = await sendVerificationCode();
      setNotice(res.message || "Code sent.");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send a new code.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-line bg-surface-2 p-6">
      <div className="flex items-center gap-2.5">
        <ShieldCheck size={18} className="text-accent" />
        <h2 className="text-base font-semibold text-ink">Verify your email</h2>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        {notice || `Enter the 6-digit code we sent to ${email}.`}
      </p>

      <form onSubmit={submit} className="mt-4">
        <input
          value={code}
          // Digits only, max 6 — the field can't hold anything the API would reject.
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setError("");
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          aria-label="6-digit verification code"
          className="w-full border border-line bg-surface-3 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-accent"
        />

        {error && <p className="mt-2 text-xs text-danger">{error}</p>}

        <button
          type="submit"
          disabled={code.length !== 6 || busy}
          className="mt-4 flex w-full items-center justify-center gap-2 bg-accent py-3 text-sm font-semibold text-ink transition-colors hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {busy ? "Verifying…" : "Verify email"}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between gap-4 text-xs">
        <button
          type="button"
          onClick={resend}
          disabled={sending}
          className="text-ink-3 underline-offset-2 transition-colors hover:text-accent hover:underline disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send a new code"}
        </button>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="font-medium text-ink-2 transition-colors hover:text-ink"
          >
            Skip for now →
          </button>
        )}
      </div>
    </div>
  );
}
