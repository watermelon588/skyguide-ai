import { Link } from "react-router-dom";

import { Navbar } from "../components/Navbar";

/**
 * /privacy — the privacy policy. Public, prose-first, honest to what the
 * platform actually collects (an astronomy app's most sensitive datum is the
 * observer's location — the policy leads with it). Linked from the sign-up /
 * sign-in consent checkbox.
 */

const EFFECTIVE_DATE = "17 July 2026";

function Section({ number, title, children }) {
  return (
    <section className="border-t border-line pt-8">
      <h2 className="flex items-baseline gap-3 text-xl font-black uppercase tracking-tight text-ink">
        <span className="font-mono text-sm text-accent">
          {String(number).padStart(2, "0")}
        </span>
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-2">
        {children}
      </div>
    </section>
  );
}

function Item({ term, children }) {
  return (
    <li className="flex flex-col gap-0.5 border-l-2 border-accent/40 pl-4 sm:flex-row sm:gap-3">
      <span className="shrink-0 font-semibold text-ink sm:w-44">{term}</span>
      <span>{children}</span>
    </li>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <Navbar />

      <main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-accent">
          SkyGuide AI
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-ink-3">
          Effective {EFFECTIVE_DATE}. This policy explains what SkyGuide AI
          collects, why, and what control you keep. The short version: we
          collect what the astronomy needs, we don't sell any of it, and your
          exact location is never shown to anyone but you.
        </p>

        <div className="mt-10 flex flex-col gap-10">
          <Section number={1} title="What we collect">
            <ul className="space-y-3">
              <Item term="Account">
                Username, email address and a hashed password (we never store
                the password itself). Optional profile details you add — bio,
                avatar image, experience level.
              </Item>
              <Item term="Observer location">
                The coordinates you set (or share via your browser) so the
                engine can compute what's visible from your sky. This is the
                most sensitive thing we hold, and it exists for one purpose:
                astronomy math.
              </Item>
              <Item term="Telescope profile">
                Aperture, focal length, mount type and similar optics data you
                save — used to personalize recommendations.
              </Item>
              <Item term="Observations">
                Your plans, logged observations, notes and priorities.
              </Item>
              <Item term="Community content">
                Messages you send in community chat and direct messages, your
                public profile fields, and — if you opt in to the community
                map — an approximate, city-level position (see section 3).
              </Item>
              <Item term="Phone sensors">
                During telescope alignment your phone streams orientation
                (compass/gyroscope) to your own dashboard in real time. This
                stream is ephemeral: it is relayed, never stored.
              </Item>
              <Item term="Cookies">
                One HTTP-only session cookie that keeps you signed in. No
                advertising cookies, no cross-site trackers, no analytics
                beacons.
              </Item>
            </ul>
          </Section>

          <Section number={2} title="How we use it">
            <p>
              Everything we collect serves the product you see: computing
              visibility and alignment for your coordinates, ranking targets
              for your telescope, sending the alerts and nightly digests you
              enable, and powering community features you choose to use.
            </p>
            <p>
              When you use the AI assistant or the nightly brief, the text of
              your question and the relevant sky context (never your
              credentials) is processed by our AI model provider to generate
              the answer. Weather, satellite-pass and astronomy data providers
              receive your coordinates solely to compute results for your sky.
            </p>
            <p>We do not sell, rent or trade personal data. There are no ads.</p>
          </Section>

          <Section number={3} title="Your location, specifically">
            <p>
              Your exact coordinates are visible only to you and are used only
              for computation. If you join the community map, other observers
              see the centre of a roughly city-sized cell (~20 km), never your
              actual position — the approximation is one-way and applied
              before anything leaves the server. Your public profile shows at
              most a place name you chose.
            </p>
          </Section>

          <Section number={4} title="What others can see">
            <p>
              Your profile has visibility controls: public, community-only, or
              private. Whatever you pick gates everything — profile page,
              community presence, map appearance. Direct messages require your
              acceptance of a ping before anyone can message you.
            </p>
          </Section>

          <Section number={5} title="Security">
            <p>
              Passwords are hashed with an industry-standard algorithm.
              Sessions live in HTTP-only cookies that page scripts cannot
              read. Sensitive endpoints are rate-limited. Telescope pairing
              uses short-lived, single-room tokens that expire in minutes and
              grant access to nothing but the pairing session itself.
            </p>
          </Section>

          <Section number={6} title="Retention & deletion">
            <p>
              Your data stays for as long as your account exists. Deleting
              content (observations, messages, telescope profiles) removes it
              from the product immediately. To delete your account and all
              associated data, contact us at the address below — we complete
              deletion within 30 days.
            </p>
          </Section>

          <Section number={7} title="Your rights">
            <p>
              You can access and correct your data from your profile at any
              time, export what you've logged, withdraw community visibility,
              and request full deletion. If you're in a jurisdiction with
              specific data-protection rights (GDPR, CCPA and similar), those
              rights apply and we honor them.
            </p>
          </Section>

          <Section number={8} title="Changes & contact">
            <p>
              If this policy changes materially we'll surface the change in
              the app before it takes effect. Questions and requests:{" "}
              <a
                href="mailto:privacy@skyguide.app"
                className="text-accent transition-colors hover:text-accent-hi"
              >
                privacy@skyguide.app
              </a>
              .
            </p>
            <p className="text-ink-3">
              <Link
                to="/"
                className="text-accent transition-colors hover:text-accent-hi"
              >
                ← Back to SkyGuide
              </Link>
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}
