/**
 * Alignment Mode microcopy — every user-facing string in one place.
 *
 * The copy line and the aria-live announcements read from the SAME functions
 * so visual and spoken guidance can never diverge. Direction words are verbs
 * only ("Sweep right · tilt up") — the experience never surfaces degrees.
 */

// A axis is "dominant" when its error is 3× the other — then we only speak
// that axis, so the user fixes one thing at a time.
const DOMINANCE_RATIO = 3;

/**
 * Human direction phrase from the backend's signed errors.
 * Signs are "degrees the telescope must move": +horizontal → clockwise
 * (right, facing the sky), +vertical → raise the tube.
 *
 * @param {number} h horizontal_error (deg)
 * @param {number} v vertical_error (deg)
 * @param {{ unreferenced?: boolean, verbose?: boolean }} opts
 *   unreferenced — no compass north reference: horizontal words are lies,
 *   speak only the vertical axis. verbose — reduced-motion spatial phrasing.
 */
export function directionPhrase(h, v, { unreferenced = false, verbose = false } = {}) {
  const horiz = h > 0 ? (verbose ? "to the right" : "Sweep right") : (verbose ? "to the left" : "Sweep left");
  const vert = v > 0 ? (verbose ? "above" : "Tilt up") : (verbose ? "below" : "Tilt down");

  const ah = Math.abs(h ?? 0);
  const av = Math.abs(v ?? 0);

  if (unreferenced || ah < 0.05) {
    return verbose ? `Target is ${vert.toLowerCase()}` : vert;
  }
  if (av < 0.05) return verbose ? `Target is ${horiz}` : horiz;

  if (verbose) return `Target is ${horiz} and ${vert.toLowerCase()}`;
  if (ah >= av * DOMINANCE_RATIO) return horiz;
  if (av >= ah * DOMINANCE_RATIO) return vert;
  return `${horiz} · ${vert.toLowerCase()}`;
}

/**
 * The single copy line for the guidance scene.
 *
 * @param {{
 *   state: string|null,
 *   update: object|null,        latest alignment:update (4Hz committed)
 *   targetName: string,
 *   targetVisible: boolean,     target presence inside the viewport
 *   inHoldZone: boolean,        angular error inside the 1° lock zone
 *   unreferenced: boolean,
 *   lowConfidence: boolean,     smoothed confidence < 45
 *   verbose: boolean,           reduced-motion spatial phrasing
 * }} s
 * @returns {string} empty string = no copy line shown (the scene speaks)
 */
export function guidanceCopy(s) {
  const { state, update, targetName } = s;

  if (state === "locked") return `Locked — ${targetName}`;
  if (s.inHoldZone) return "Hold steady…";
  if (state === "nearly_aligned") return withSignal("Almost there.", s);

  if (!update) return `Tracking ${targetName} — waiting for your phone…`;

  // Mid-range with the target on screen: the scene IS the instruction.
  if (state === "close" && s.targetVisible && !s.verbose) {
    return withSignal("", s);
  }

  return withSignal(
    directionPhrase(update.horizontal_error, update.vertical_error, {
      unreferenced: s.unreferenced,
      verbose: s.verbose,
    }),
    s,
  );
}

function withSignal(phrase, { lowConfidence }) {
  if (!lowConfidence) return phrase;
  return phrase ? `${phrase} · signal unsteady` : "Signal unsteady";
}

/** Spoken announcements for state transitions (aria-live). */
export function stateAnnouncement(state, update, targetName, unreferenced) {
  switch (state) {
    case "locked":
      return `Locked on ${targetName}.`;
    case "nearly_aligned":
      return "Nearly aligned — hold steady.";
    case "close":
      return update
        ? `Close — ${directionPhrase(update.horizontal_error, update.vertical_error, { unreferenced, verbose: true }).toLowerCase()}.`
        : "Close.";
    case "searching":
      return update
        ? `Searching — ${directionPhrase(update.horizontal_error, update.vertical_error, { unreferenced, verbose: true }).toLowerCase()}.`
        : "Searching for the target.";
    case "below_horizon":
      return `${targetName} is below the horizon right now.`;
    case "lost":
      return "Signal lost — check the phone on your telescope.";
    default:
      return "";
  }
}

/** Edge-state cards: one sentence + at most one primary action. */
export const EDGE_COPY = {
  permission_denied: {
    title: "Motion access denied",
    body: "Your phone denied motion permission. Re-enable it on the phone (Settings → Safari → Motion & Orientation Access on iOS), then return here.",
    primary: null,
  },
  no_observer: {
    title: "Set your location first",
    body: "SkyGuide needs your observer location to compute where objects are in your sky.",
    primary: "Back to dashboard",
  },
  pairing_lost: {
    title: "Phone disconnected",
    body: "The pairing session ended. Re-pair your phone from the dashboard to continue aligning.",
    primary: "Back to dashboard",
  },
  stream_background: {
    title: "Phone screen is off",
    body: "Your phone stopped streaming because its screen turned off. Wake the phone to continue.",
    primary: null,
  },
  stream_lost: {
    title: "Signal lost",
    body: "The orientation stream went silent. Check the phone mounted on your telescope.",
    primary: null,
  },
  below_horizon: {
    title: "Below the horizon",
    body: (name) => `${name} is below the horizon right now — it isn't observable from your location at this moment.`,
    primary: "Choose another target",
    secondary: "Keep tracking anyway",
  },
};

export const UNREFERENCED_BANNER =
  "Compass not referenced — vertical guidance only. Move the phone in a figure-8 to calibrate.";

export const NOT_FOUND_HINT = (query) =>
  `Couldn't find "${query}" — try a Messier id like M31 or M42.`;
