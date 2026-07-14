import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Central GSAP setup for the redesigned UI. Registering ScrollTrigger in one
 * place keeps every FX component in sync and avoids double-registration
 * warnings. Import { gsap, ScrollTrigger, prefersReducedMotion } from here.
 */
gsap.registerPlugin(ScrollTrigger);

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger };
