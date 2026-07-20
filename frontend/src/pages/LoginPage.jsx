import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import VerifyEmailPanel from "../components/auth/VerifyEmailPanel";
import Logo from "../components/brand/Logo";
import { BRAND_FULL_NAME } from "../config/brand";
import loginImage from "../assets/bg/9.jpg";

/**
 * Auth — the front door (redesign v2.0 "Bento / Electric Blue").
 *
 * A bold editorial split: a full-bleed image panel on the left, a flat,
 * radius-0, blue-accented form on the right. No glass, no rounded corners,
 * Satoshi throughout. All authentication behaviour is unchanged — same state,
 * handlers, error-toast timers, Login/Sign-up toggle and redirect.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { loginUser, registerUser } = useAuth();
  const [currentState, setCurrentState] = useState("Login");

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showError, setShowError] = useState(false);
  // Required consent — both modes. Survives the Login/Sign-up toggle on
  // purpose: one acknowledgement per visit is enough friction.
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // After sign-up the observer is ALREADY signed in; this step is an optional
  // offer to verify now rather than a gate. `null` = show the normal form.
  const [verifyStep, setVerifyStep] = useState(null); // { email, emailSent }

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      if (currentState === "Sign up") {
        // Registration now signs the observer in outright, so instead of
        // redirecting we offer the verification step — which they can skip.
        const result = await registerUser({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });
        setVerifyStep({
          email: formData.email,
          emailSent: result?.emailSent !== false,
        });
        return;
      }

      await loginUser({
        email: formData.email,
        password: formData.password,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!error) return;

    setShowError(true);

    const hideTimer = setTimeout(() => {
      setShowError(false);
    }, 3000);

    const removeTimer = setTimeout(() => {
      setError("");
    }, 3500);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [error]);

  const isSignup = currentState === "Sign up";

  const inputClass =
    "w-full border border-line bg-surface-2 px-4 py-3 text-ink outline-none " +
    "placeholder:text-ink-3 transition-colors duration-300 focus:border-accent";

  return (
    <div className="relative flex min-h-screen bg-bg text-ink">
      {/* Left — full-bleed image panel (editorial, desktop only) */}
      <div className="relative hidden overflow-hidden border-r border-line lg:block lg:w-1/2 xl:w-3/5">
        <img
          src={loginImage}
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/75 to-black/25" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link
            to="/"
            aria-label={`${BRAND_FULL_NAME} — home`}
          >
            <Logo size="md" decorative />
          </Link>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
              Your intelligent astronomy copilot
            </p>
            <h2 className="mt-5 max-w-lg text-5xl font-black uppercase leading-[0.95] tracking-tight text-ink xl:text-6xl">
              Discover the universe, one night at a time.
            </h2>
          </div>
          <p className="text-xs uppercase tracking-[0.15em] text-ink-3">
            13,000+ deep-sky objects · live visibility scoring · phone-guided
            alignment
          </p>
        </div>
      </div>

      {/* Right — the form column */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2 xl:w-2/5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {/* Back */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mb-10 inline-flex items-center gap-2 text-sm text-ink-2 transition-colors duration-300 hover:text-accent"
          >
            <ArrowLeft size={16} />
            Back home
          </button>

          {/* Logo (mobile — the panel carries it on desktop) */}
          <Logo size="xl" className="lg:hidden" />

          {/* Post-sign-up: already authenticated, just offering verification. */}
          {verifyStep ? (
            <>
              <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-ink">
                You're in
              </h1>
              <p className="mt-2 text-sm text-ink-3">
                Your account is ready. Verify your email now, or do it later
                from your profile.
              </p>

              <div className="mt-6">
                <VerifyEmailPanel
                  email={verifyStep.email}
                  codeAlreadySent={verifyStep.emailSent}
                  onVerified={() => navigate("/dashboard")}
                  onSkip={() => navigate("/dashboard")}
                />
              </div>

              {!verifyStep.emailSent && (
                <p className="mt-4 text-xs text-ink-3">
                  We couldn't send the email just now — you can skip this and
                  verify later from your profile.
                </p>
              )}
            </>
          ) : (
            <>
          {/* Heading */}
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-ink">
            {isSignup ? "Create account" : "Sign in"}
          </h1>
          <p className="mt-2 text-sm text-ink-3">
            {isSignup
              ? "Create your account to start observing."
              : "Welcome back — your sky is waiting."}
          </p>

          {/* Inline error */}
          {error && (
            <div
              role="alert"
              className={`mt-6 border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger transition-all duration-500 ${
                showError
                  ? "translate-y-0 opacity-100"
                  : "-translate-y-1 opacity-0"
              }`}
            >
              {error}
            </div>
          )}

          <form onSubmit={onSubmitHandler} className="mt-6 space-y-4">
            {isSignup && (
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
                className={inputClass}
              />
            )}

            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              required
              className={inputClass}
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className={inputClass}
            />

            {/* Privacy consent — required in both modes. The link opens in a
                new tab so the form (and what's typed) survives the detour. */}
            <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-ink-2">
              <input
                type="checkbox"
                required
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none border border-line bg-surface-2 transition-colors checked:border-accent checked:bg-accent"
              />
              <span>
                I have read and agree to the{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-accent transition-colors duration-300 hover:text-accent-hi"
                >
                  Privacy Policy
                </a>
                , including how my observing location is used.
              </span>
            </label>

            <motion.button
              type="submit"
              disabled={loading || !privacyAccepted}
              whileHover={{ scale: loading || !privacyAccepted ? 1 : 1.01 }}
              whileTap={{ scale: loading || !privacyAccepted ? 1 : 0.99 }}
              className="w-full bg-accent py-3.5 font-semibold text-ink transition-colors duration-300 hover:bg-accent-hi disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Please wait…"
                : isSignup
                  ? "Create account"
                  : "Sign in"}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-ink-4">
              or
            </span>
            <div className="h-px flex-1 bg-line" />
          </div>

          {/* Toggle */}
          <p className="text-center text-sm text-ink-3">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setCurrentState(isSignup ? "Login" : "Sign up");
                setError("");
              }}
              className="font-semibold text-accent transition-colors duration-300 hover:text-accent-hi"
            >
              {isSignup ? "Sign in" : "Sign up"}
            </button>
          </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
