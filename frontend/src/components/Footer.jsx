import {
  FaDiscord,
  FaGithub,
  FaInstagram,
  FaLinkedin,
  FaXTwitter,
  FaArrowUp,
  FaRocket,
} from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="relative mt-32 overflow-hidden border-t border-white/10 bg-[#050816] text-white">
      {/* Background Glow */}
      <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[180px]" />

      <div className="relative mx-auto max-w-7xl px-8 py-24">
        {/* CTA */}

        <div className="mb-24 rounded-3xl border border-violet-500/20 bg-white/5 p-12 backdrop-blur-xl">
          <h2 className="text-5xl font-bold">Ready for Tonight's Sky?</h2>

          <p className="mt-4 max-w-2xl text-lg text-gray-400">
            Connect your telescope, receive AI recommendations, and never miss
            another celestial event.
          </p>

          <div className="mt-10 flex gap-5">
            <button className="rounded-xl bg-violet-600 px-8 py-4 font-semibold transition hover:bg-violet-500">
              Sync Telescope
            </button>

            <button className="rounded-xl border border-violet-500 px-8 py-4 transition hover:bg-violet-500/10">
              Explore Sky
            </button>
          </div>
        </div>

        {/* Main */}

        <div className="grid gap-16 lg:grid-cols-5">
          {/* Brand */}

          <div>
            <h1 className="text-4xl font-bold">
              SkyGuide
              <span className="text-violet-500"> AI</span>
            </h1>

            <p className="mt-6 leading-8 text-gray-400">
              Your AI-powered celestial companion helping amateur astronomers
              discover the universe one night at a time.
            </p>

            <div className="mt-8 flex gap-4 text-2xl">
              <FaGithub />

              <FaLinkedin />

              <FaInstagram />

              <FaDiscord />

              <FaXTwitter />
            </div>
          </div>

          {/* Explore */}

          <div>
            <h3 className="mb-5 font-semibold text-violet-400">Explore</h3>

            <ul className="space-y-3 text-gray-400">
              <li>Live Sky</li>
              <li>Sky Map</li>
              <li>ISS Tracker</li>
              <li>Planet Finder</li>
              <li>Meteor Showers</li>
            </ul>
          </div>

          {/* Resources */}

          <div>
            <h3 className="mb-5 font-semibold text-violet-400">Resources</h3>

            <ul className="space-y-3 text-gray-400">
              <li>Documentation</li>
              <li>API</li>
              <li>Observing Guide</li>
              <li>Blog</li>
              <li>Community</li>
            </ul>
          </div>

          {/* Company */}

          <div>
            <h3 className="mb-5 font-semibold text-violet-400">Company</h3>

            <ul className="space-y-3 text-gray-400">
              <li>About</li>
              <li>Contact</li>
              <li>Privacy</li>
              <li>Terms</li>
            </ul>
          </div>

          {/* Quote */}

          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <FaRocket className="mb-5 text-4xl text-violet-500" />

            <p className="italic leading-8 text-gray-300">
              "Somewhere, something incredible is waiting to be known."
            </p>

            <p className="mt-4 text-violet-400">— Carl Sagan</p>
          </div>
        </div>

        {/* Newsletter */}

        <div className="mt-24 rounded-3xl border border-violet-500/20 bg-white/5 p-10">
          <div className="flex flex-col items-center justify-between gap-8 lg:flex-row">
            <div>
              <h2 className="text-3xl font-bold">Join our Space Newsletter</h2>

              <p className="mt-3 text-gray-400">
                Astronomy events, launches and AI updates every week.
              </p>
            </div>

            <div className="flex w-full max-w-xl">
              <input
                placeholder="Enter your email"
                className="flex-1 rounded-l-xl border border-white/10 bg-transparent px-6 outline-none"
              />

              <button className="rounded-r-xl bg-violet-600 px-8 font-semibold hover:bg-violet-500">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom */}

        <div className="mt-20 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 lg:flex-row">
          <p className="text-gray-500">
            © 2026 SkyGuide AI. All rights reserved.
          </p>

          <div className="flex gap-8 text-gray-400">
            <span>Powered by NASA APIs</span>

            <span>ESA</span>

            <span>Astrometry.net</span>
          </div>

          <button className="rounded-full border border-violet-500 p-3 hover:bg-violet-600">
            <FaArrowUp />
          </button>
        </div>
      </div>
    </footer>
  );
}
