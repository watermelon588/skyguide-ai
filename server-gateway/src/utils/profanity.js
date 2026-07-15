/**
 * Minimal profanity mask for community chat (Feature 6c).
 *
 * Deliberately conservative. A wordlist filter is a blunt instrument — the
 * classic failure is the Scunthorpe problem, where a substring match censors
 * innocent words ("class", "assess", "Uranus" in an astronomy app of all
 * places). So:
 *
 *   - matching is WHOLE-WORD only (\b...\b), never substring;
 *   - the list stays short and unambiguous rather than exhaustive;
 *   - we MASK the word instead of rejecting the message, because a false
 *     positive that eats someone's whole observation report is worse than a
 *     slur that shows up as ****.
 *
 * This is not moderation — Report + Block are. It only takes the edge off.
 */

const WORDS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "bastard",
  "dickhead",
  "motherfucker",
  "slut",
  "whore",
  "nigger",
  "faggot",
  "retard",
];

// Whole-word, case-insensitive; allows common suffixes (fucking, shits) but
// never matches inside an unrelated word.
const PATTERN = new RegExp(
  `\\b(${WORDS.join("|")})(s|es|ing|ed|er)?\\b`,
  "gi",
);

/** Replace matched words with asterisks of the same length. */
function mask(text = "") {
  return String(text).replace(PATTERN, (match) => "*".repeat(match.length));
}

/** True when the text contains at least one listed word. */
function contains(text = "") {
  PATTERN.lastIndex = 0; // the regex is global; reset before a bare test
  return PATTERN.test(String(text));
}

module.exports = { mask, contains };
