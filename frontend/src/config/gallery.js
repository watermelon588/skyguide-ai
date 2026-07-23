/* ═══════════════════════════════════════════════════════════════════════
   GALLERY KNOBS — tune the featured card fan from this one file.
   Ported from the Multi-Modal-Search-Engine gallery and retuned for
   SkyGuide's wider layout.
   ═══════════════════════════════════════════════════════════════════════ */
export const GALLERY = {
  cardSize: 240, // px — width/height of each featured card
  spread: 148, // px — horizontal distance between neighbouring cards
  hoverPush: 170, // px — how far siblings slide away on hover
  maxTilt: 5, // deg — rotation of the outermost cards

  /* Cards per row. The fan is horizontal, so without a wrap every extra photo
     either overflows the viewport or shrinks the whole strip to fit — at 7+ the
     cards became unreadable. Five keeps a row inside the page's max width at
     full size; anything beyond wraps to the next row. */
  perRow: 5,

  /* Vertical room for ONE row of fanned cards. Just over cardSize, because a
     card tilted by maxTilt is slightly taller than its own height
     (240·cos5° + 240·sin5° ≈ 260). Keeping it tight is what makes the rows sit
     close together. */
  containerHeight: 268,

  /* Gap between wrapped rows (px). Deliberately small — the rows should read as
     one block of photos, not as separate sections. */
  rowGap: 8,

  /* Vertical rhythm of the featured section (px). */
  paddingTop: 24,
  paddingBottom: 56,
};

/**
 * Lines shown beneath each photo.
 *
 * Chosen per-photo by a STABLE hash of the post id (see quoteForId), not at
 * random: a quote that reshuffles on every render — or worse, on every like —
 * reads as a glitch, and the pairing should feel authored.
 */
export const ASTRO_QUOTES = [
  {
    text: "We are a way for the cosmos to know itself.",
    source: "Carl Sagan, Cosmos",
  },
  {
    text: "Somewhere, something incredible is waiting to be known.",
    source: "Carl Sagan",
  },
  {
    text: "The nitrogen in our DNA, the calcium in our teeth, the iron in our blood were made in the interiors of collapsing stars.",
    source: "Carl Sagan, Cosmos",
  },
  {
    text: "We are all in the gutter, but some of us are looking at the stars.",
    source: "Oscar Wilde",
  },
  {
    text: "The universe is under no obligation to make sense to you.",
    source: "Neil deGrasse Tyson",
  },
  {
    text: "We are part of this universe; we are in this universe, but perhaps more important than both of those facts, is that the universe is in us.",
    source: "Neil deGrasse Tyson, Astrophysics for People in a Hurry",
  },
  {
    text: "The good thing about science is that it's true whether or not you believe in it.",
    source: "Neil deGrasse Tyson",
  },
  {
    text: "We are the cosmos made conscious and life is the means by which the universe understands itself.",
    source: "Brian Cox",
  },
  {
    text: "The night sky is the most beautiful thing that any of us will ever see.",
    source: "Brian Cox, Wonders of the Universe",
  },
  {
    text: "We are the legacy of 13.8 billion years of cosmic evolution.",
    source: "Brian Cox, Human Universe",
  },
  {
    text: "Look up at the stars and not down at your feet.",
    source: "Stephen Hawking",
  },
  {
    text: "Remember to look up at the stars and not down at your feet. Be curious.",
    source: "Stephen Hawking",
  },
  {
    text: "Equipped with his five senses, man explores the universe around him and calls the adventure Science.",
    source: "Edwin Hubble, The Nature of Science",
  },
  {
    text: "For small creatures such as we, the vastness is bearable only through love.",
    source: "Carl Sagan, Contact",
  },
  {
    text: "Astronomy compels the soul to look upward, and leads us from this world to another.",
    source: "Plato, The Republic",
  },
  {
    text: "Two things fill the mind with ever new and increasing admiration: the starry heavens above me and the moral law within me.",
    source: "Immanuel Kant",
  },
  {
    text: "Not only is the universe stranger than we imagine, it is stranger than we can imagine.",
    source: "Arthur Eddington",
  },
  {
    text: "The cosmos is within us. We are made of star-stuff.",
    source: "Carl Sagan, Cosmos",
  },
];

/**
 * Deterministic quote for a post.
 *
 * A simple string hash over the id keeps the same photo paired with the same
 * line forever, across reloads and across users, with no field to store.
 */
export function quoteForId(id = "") {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return ASTRO_QUOTES[hash % ASTRO_QUOTES.length];
}
