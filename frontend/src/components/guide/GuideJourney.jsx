import { useRef } from "react";
import { Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Check, Flag, MapPin } from "lucide-react";

import { gsap, ScrollTrigger, prefersReducedMotion } from "../fx/gsap";

/**
 * The First Light Guide as a journey — a path you walk from "just signed up" to
 * "the target is in the eyepiece".
 *
 * A vertical trail runs down the page; its accent fill advances as you scroll
 * (GSAP ScrollTrigger scrub), each milestone rising in and its node lighting up
 * as you reach it. Milestones alternate sides on desktop and stack down the
 * left on mobile. For a signed-in observer a completed step's node turns green —
 * the journey doubles as a checklist. Honors prefers-reduced-motion (everything
 * shown, no scrub).
 */

function Node({ index, done }) {
  return (
    <span
      className={`flex h-11 w-11 items-center justify-center border text-base font-bold tabular-nums shadow-[0_0_0_6px_var(--color-bg)] transition-colors ${
        done
          ? "border-success/50 bg-success/15 text-success"
          : "border-accent/40 bg-surface-1 text-accent"
      }`}
    >
      {done ? <Check size={18} /> : index + 1}
    </span>
  );
}

function Milestone({ step, index, done, side }) {
  const right = side === "right";
  return (
    <div
      id={`step-${step.id}`}
      data-milestone
      className="relative scroll-mt-28"
    >
      {/* Node on the trail (left on mobile, centered on desktop). */}
      <div className="absolute left-5 top-1 z-10 -translate-x-1/2 lg:left-1/2">
        <Node index={index} done={done} />
      </div>

      {/* Card, offset from the trail; alternates sides on desktop. */}
      <div
        className={`pl-16 lg:w-[calc(50%-2.5rem)] lg:pl-0 ${
          right ? "lg:ml-auto lg:pl-14" : "lg:mr-auto lg:pr-14"
        }`}
      >
        <div className="border border-line bg-surface-2 p-6 transition-colors duration-300 hover:bg-surface-3 sm:p-7">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.3em] text-ink-3">
            <span className="text-accent">{step.icon}</span>
            {step.eyebrow}
            {done && (
              <span className="bg-success/10 px-2 py-0.5 text-[10px] text-success">
                Done
              </span>
            )}
          </p>
          <h2 className="mt-3 text-xl font-black uppercase tracking-tight text-ink sm:text-2xl">
            {step.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">{step.body}</p>
          <Link
            to={step.cta.to}
            className="mt-5 inline-flex items-center gap-2 border border-line bg-surface-1 px-5 py-2.5 text-sm font-semibold text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            {step.cta.label}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function GuideJourney({ steps, done }) {
  const scope = useRef(null);
  const fillRef = useRef(null);

  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      if (reduced) {
        gsap.set(fillRef.current, { scaleY: 1 });
        gsap.set("[data-milestone]", { opacity: 1, y: 0 });
        return;
      }

      // The trail fills as you scroll through the journey.
      gsap.fromTo(
        fillRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: scope.current,
            start: "top 55%",
            end: "bottom 70%",
            scrub: true,
          },
        },
      );

      // Each milestone rises in as it's reached.
      gsap.utils.toArray("[data-milestone]").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 42 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 82%" },
          },
        );
      });

      // Endpoints.
      gsap.utils.toArray("[data-trail-cap]").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, scale: 0.8 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: "back.out(1.7)",
            scrollTrigger: { trigger: el, start: "top 85%" },
          },
        );
      });

      return () => ScrollTrigger.getAll().forEach((t) => t.kill());
    },
    { scope },
  );

  return (
    <div ref={scope} className="relative mx-auto w-full max-w-4xl">
      {/* Trail track + scroll-scrubbed fill. */}
      <div className="absolute bottom-0 left-5 top-0 w-px bg-line lg:left-1/2 lg:-translate-x-1/2" />
      <div
        ref={fillRef}
        className="absolute bottom-0 left-5 top-0 w-px origin-top bg-gradient-to-b from-accent to-accent-hi lg:left-1/2 lg:-translate-x-1/2"
      />

      {/* Start cap — label sits BESIDE the node (fixed offset from the trail),
          never centered over it: a centered label + margin overlapped the node
          box on desktop. */}
      <div data-trail-cap className="relative mb-10 flex h-11 items-center pl-16 lg:pl-[calc(50%+2.5rem)]">
        <span className="absolute left-5 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-1/2">
          <span className="flex h-11 w-11 items-center justify-center border border-accent/40 bg-surface-1 text-accent shadow-[0_0_0_6px_var(--color-bg)]">
            <MapPin size={18} />
          </span>
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-ink-3">
          Start here
        </span>
      </div>

      <div className="flex flex-col gap-12 lg:gap-16">
        {steps.map((step, i) => (
          <Milestone
            key={step.id}
            step={step}
            index={i}
            done={step.track ? Boolean(done[step.id]) : false}
            side={i % 2 === 0 ? "left" : "right"}
          />
        ))}
      </div>

      {/* Destination cap — same beside-the-node geometry as the start cap. */}
      <div data-trail-cap className="relative mt-10 flex h-11 items-center pl-16 lg:pl-[calc(50%+2.5rem)]">
        <span className="absolute left-5 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-1/2">
          <span className="flex h-11 w-11 items-center justify-center border border-accent/50 bg-accent/15 text-accent shadow-[0_0_0_6px_var(--color-bg)]">
            <Flag size={18} />
          </span>
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-accent">
          First light
        </span>
      </div>
    </div>
  );
}
