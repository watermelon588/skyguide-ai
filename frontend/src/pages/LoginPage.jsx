import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import { useEffect } from "react";
import "../styles/animations.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";
import { resendVerification } from "../services/auth.service";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser, registerUser } = useAuth();
  const [currentState, setCurrentState] = useState("Login");

  const [formData, setFormData] = useState({
    username: "",
    // Prefill after a verify/reset hand-off ("Email verified — sign in").
    email: location.state?.email || "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showError, setShowError] = useState(false);
  // Green banner from verify/reset hand-offs (location.state.notice).
  const [notice, setNotice] = useState(location.state?.notice || "");
  // Set when login fails specifically because the email isn't verified —
  // renders an inline resend panel instead of the generic error toast.
  const [unverified, setUnverified] = useState(false);
  const [resendState, setResendState] = useState("idle");

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
    setUnverified(false);
    setNotice("");

    try {
      if (currentState === "Sign up") {
        await registerUser({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });
        // No session exists yet (email must be verified first) — hand off to
        // the inbox waiter, which advances by itself once the link is clicked.
        navigate("/verify-email", { state: { email: formData.email } });
        return;
      }
      await loginUser({
        email: formData.email,
        password: formData.password,
      });
      navigate("/dashboard");
    } catch (err) {
      const message = err.response?.data?.message || "Something went wrong.";
      if (err.response?.status === 403 && /verify your email/i.test(message)) {
        setUnverified(true);
      } else {
        setError(message);
        setShowError(true); // reveal the toast at the source of the error
      }
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (resendState === "sending") return;
    setResendState("sending");
    try {
      await resendVerification(formData.email);
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  };

  // showError is raised where the error is set; this effect only schedules
  // the auto-hide + clear so no setState runs synchronously in the effect body.
  useEffect(() => {
    if (!error) return;

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

  return (
    <div className="relative min-h-screen flex items-center gap-50 justify-end px-40">
      {/* Left Section */}
      <div className="flex items-center gap-16">
        <div className="relative">
          <img
            src={assets[17]}
            alt="Astronaut"
            className="w-[120px] object-contain animate-lost-space "
          />
          <div className="speech-bubble bubble-right bubble-right-1">
            Tell them to log in already
          </div>

          <div className="speech-bubble bubble-right bubble-right-2">
            I'm losing my mind
          </div>
        </div>
        <div className="relative">
          <img
            src={assets[16]}
            alt="Astronaut"
            className="w-[250px] object-contain animate-space"
          />
          <div className="speech-bubble bubble-left">
            Hey... you okay, my guy?
          </div>
        </div>
      </div>
      {/* right Section */}
      <div
        className="
    w-[420px]
    max-w-md
    rounded-xl
    border
    border-white/30
    bg-black/20
    backdrop-blur-xl
    p-8
    shadow-xl
    min-h-[500px]
    transition-all duration-300
  "
      >
        {/* back button */}
        <button
          onClick={() => navigate("/")}
          className="
    absolute
    top-8
    left-8
    flex
    items-center
    gap-2
    text-white
    transition-all
    duration-300
    hover:-translate-x-1
  "
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        {/* Logo */}
        <div
          className={`text-center ${
            currentState === "Sign up" ? "mb-1" : "mb-2"
          }`}
        >
          <h1 className="text-3xl font-bold tracking-wide">SkyGuide AI</h1>

          <p
            className={`text-gray-300 ${
              currentState === "Sign up" ? "mt-1" : "mt-2"
            }`}
          >
            Your intelligent astronomy companion
          </p>
        </div>

        {/* Heading */}

        <div
          className={`text-center ${
            currentState === "Sign up" ? "mb-4" : "mb-6"
          }`}
        >
          <h2 className="text-2xl font-semibold">{currentState}</h2>

          <p
            className={`text-sm text-gray-400 ${
              currentState === "Sign up" ? "mt-0.5" : "mt-1"
            }`}
          >
            {currentState === "Login" ? "Welcome back!" : "Create your account"}
          </p>
        </div>

        <div
          className={`
    absolute
    ${currentState === "Sign up" ? "bottom-14" : "bottom-18"}
    right-28
    z-50
    rounded-lg
    border
    border-red-400/20
    bg-red-900/70
    backdrop-blur-md
    px-4
    py-2
    text-sm
    text-red-100
    shadow-xl
    transition-all
duration-700
ease-[cubic-bezier(0.22,1,0.36,1)]


    ${
      showError
        ? "opacity-100 translate-y-0 scale-100"
        : "opacity-0 translate-y-4 scale-95 pointer-events-none"
    }
  `}
        >
          {error}
        </div>

        {/* Verified/reset hand-off banner */}
        {notice && (
          <p className="mb-4 rounded-md border border-green-400/20 bg-green-900/40 px-4 py-2 text-center text-sm text-green-100">
            {notice}
          </p>
        )}

        {/* Unverified-login panel — actionable, not just an error */}
        {unverified && (
          <div className="mb-4 space-y-2 rounded-md border border-orange-400/20 bg-orange-900/30 px-4 py-3 text-sm">
            <p className="text-orange-100">
              Your email isn't verified yet — check your inbox, or resend the
              link.
            </p>
            <button
              type="button"
              onClick={onResend}
              disabled={resendState === "sending"}
              className="font-semibold text-white hover:underline disabled:opacity-60"
            >
              {resendState === "sending"
                ? "Sending…"
                : resendState === "sent"
                  ? "Sent — check your inbox"
                  : resendState === "error"
                    ? "Failed — try again"
                    : "Resend verification email"}
            </button>
          </div>
        )}

        {/* Form */}

        <form
          onSubmit={onSubmitHandler}
          className={`transition-all duration-300 ${
            currentState === "Sign up" ? "space-y-3" : "space-y-5"
          }`}
        >
          {/* Username */}

          {currentState === "Sign up" && (
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
              className="
              w-full
              rounded-md
              border
              border-white/20
              bg-white/20
              px-4
              py-3
              outline-none
              backdrop-blur-lg
              placeholder:text-gray-400
              focus:border-white/40
              transition
            "
            />
          )}

          {/* Email */}

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
            className="
            w-full
            rounded-md
            border
            border-white/20
            bg-white/10
            px-4
            py-3
            outline-none
            backdrop-blur-lg
            placeholder:text-gray-400
            focus:border-white/40
            transition
          "
          />

          {/* Password */}

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="
            w-full
            rounded-md
            border
            border-white/20
            bg-white/10
            px-4
            py-3
            outline-none
            backdrop-blur-lg
            placeholder:text-gray-400
            focus:border-white/40
            transition
          "
          />

          {/* Forgot password — login mode only */}
          {currentState === "Login" && (
            <div className="-mt-2 text-right">
              <Link
                to="/forgot-password"
                className="text-xs text-gray-400 transition hover:text-white hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          )}

          {/* Submit Button */}

          <button
            type="submit"
            disabled={loading}
            className="
            w-full
            rounded-md
            border
            border-white/20
            bg-white/10
            py-3
            font-semibold
            backdrop-blur-md
            transition
            hover:bg-white/20
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
          >
            {loading
              ? "Please wait..."
              : currentState === "Login"
                ? "Login"
                : "Create Account"}
          </button>

          {/* Divider */}

          <div
            className={`flex items-center gap-4 transition-all duration-300 ${
              currentState === "Sign up" ? "py-1" : "py-2"
            }`}
          >
            <div className="h-px flex-1 bg-white/10"></div>

            <span className="text-xs text-gray-400">OR</span>

            <div className="h-px flex-1 bg-white/10"></div>
          </div>

          {/* Toggle */}

          <div
            className={`text-center transition-all duration-300 ${
              currentState === "Sign up" ? "mt-1" : "mt-4"
            }`}
          >
            {currentState === "Login" ? (
              <p className="text-sm text-gray-400">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentState("Sign up");
                    setError("");
                  }}
                  className="font-semibold text-white hover:underline"
                >
                  Sign Up
                </button>
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentState("Login");
                    setError("");
                  }}
                  className="font-semibold text-white hover:underline"
                >
                  Login
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
