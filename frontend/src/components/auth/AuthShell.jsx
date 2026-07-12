import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

/**
 * Shared frame for the secondary auth pages (forgot / reset / verify) —
 * the same glass card language as LoginPage so the whole auth surface
 * reads as one place. Children render below the standard header.
 */

export const AUTH_INPUT_CLASS =
  "w-full rounded-md border border-white/20 bg-white/10 px-4 py-3 outline-none backdrop-blur-lg placeholder:text-gray-400 focus:border-white/40 transition";

export const AUTH_BUTTON_CLASS =
  "w-full rounded-md border border-white/20 bg-white/10 py-3 font-semibold backdrop-blur-md transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60";

export default function AuthShell({ heading, sub, backTo = "/login", children }) {
  const navigate = useNavigate();
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 text-white">
      <div className="relative w-[420px] max-w-md rounded-xl border border-white/30 bg-black/20 p-8 shadow-xl backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate(backTo)}
          aria-label="Back"
          className="absolute left-6 top-6 flex items-center gap-2 text-white transition-all duration-300 hover:-translate-x-1"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>

        <div className="mb-2 text-center">
          <h1 className="text-3xl font-bold tracking-wide">SkyGuide AI</h1>
          <p className="mt-2 text-gray-300">
            Your intelligent astronomy companion
          </p>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold">{heading}</h2>
          {sub && <p className="mt-1 text-sm text-gray-400">{sub}</p>}
        </div>

        {children}
      </div>
    </div>
  );
}
