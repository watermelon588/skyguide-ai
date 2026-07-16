import { Link } from "react-router-dom";

import { Navbar } from "../components/Navbar";
import Starfield from "../components/tonight/Starfield";

/**
 * 404 — an unknown URL used to render nothing. Now it lands here: the app's
 * visual language (starfield + shared nav), a clear "lost in space" message,
 * and the two ways back that matter.
 */
export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-bg text-ink">
      <Starfield />

      <div className="relative z-20">
        <Navbar />
      </div>

      <main className="relative z-10 mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
          Error 404
        </p>
        <h1 className="mt-4 text-[clamp(3rem,12vw,7rem)] font-black uppercase leading-none tracking-tight text-ink">
          Lost in space
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-ink-2">
          There's nothing catalogued at this address. It may have moved, or never
          existed — like a star that was only ever a smudge on the plate.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="bg-accent px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-accent-hi"
          >
            Back to home
          </Link>
          <Link
            to="/tonight"
            className="border border-line bg-surface-2 px-6 py-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
          >
            See tonight's sky
          </Link>
          <Link
            to="/explore"
            className="border border-line bg-surface-2 px-6 py-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
          >
            Explore the catalog
          </Link>
        </div>
      </main>
    </div>
  );
}
