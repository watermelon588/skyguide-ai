/**
 * Demo telescope catalog (temporary).
 *
 * Session 10 is frontend-only: this hardcoded list stands in for a future
 * `GET /telescopes/catalog` endpoint. Each entry carries realistic optical +
 * mount specs. Derived values (f-ratio, magnification, limiting magnitude) are
 * NOT stored here — they are computed on the fly in utils/telescopeCalculations.
 *
 * Session 11 can delete this file and point the search at the backend without
 * touching any UI component.
 */

/** Telescope type options (also used by the custom form dropdown). */
export const TELESCOPE_TYPES = [
  "Refractor",
  "Reflector",
  "Dobsonian",
  "Maksutov",
  "Schmidt-Cassegrain",
  "Ritchey-Chretien",
  "Newtonian",
  "Binocular",
  "Smart Telescope",
  "Custom",
];

/** Mount type options (also used by the custom form dropdown). */
export const MOUNT_TYPES = [
  "Alt-Az",
  "Equatorial",
  "Dobsonian",
  "German EQ",
  "Fork",
  "GoTo",
  "Custom",
];

export const DEMO_TELESCOPES = [
  { id: "sw-explorer-130p", brand: "Sky-Watcher", model: "Explorer 130P", type: "Reflector", aperture_mm: 130, focal_length_mm: 650, mount: "Equatorial", tracking: false, goto: false, cameraSupport: true, weight_kg: 6.6 },
  { id: "sw-heritage-150p", brand: "Sky-Watcher", model: "Heritage 150P", type: "Dobsonian", aperture_mm: 150, focal_length_mm: 750, mount: "Dobsonian", tracking: false, goto: false, cameraSupport: true, weight_kg: 7.0 },
  { id: "sw-heritage-130p", brand: "Sky-Watcher", model: "Heritage 130P", type: "Dobsonian", aperture_mm: 130, focal_length_mm: 650, mount: "Dobsonian", tracking: false, goto: false, cameraSupport: true, weight_kg: 4.5 },
  { id: "sw-classic-200p", brand: "Sky-Watcher", model: "Classic 200P", type: "Dobsonian", aperture_mm: 200, focal_length_mm: 1200, mount: "Dobsonian", tracking: false, goto: false, cameraSupport: true, weight_kg: 24.0 },
  { id: "sw-quattro-200p", brand: "Sky-Watcher", model: "Quattro 200P", type: "Newtonian", aperture_mm: 200, focal_length_mm: 800, mount: "German EQ", tracking: false, goto: false, cameraSupport: true, weight_kg: 8.9 },
  { id: "sw-skymax-127", brand: "Sky-Watcher", model: "Skymax 127", type: "Maksutov", aperture_mm: 127, focal_length_mm: 1500, mount: "Alt-Az", tracking: false, goto: false, cameraSupport: true, weight_kg: 3.3 },
  { id: "sw-skymax-102", brand: "Sky-Watcher", model: "Skymax 102", type: "Maksutov", aperture_mm: 102, focal_length_mm: 1300, mount: "Alt-Az", tracking: false, goto: false, cameraSupport: true, weight_kg: 1.9 },
  { id: "sw-evostar-72ed", brand: "Sky-Watcher", model: "Evostar 72ED", type: "Refractor", aperture_mm: 72, focal_length_mm: 420, mount: "Equatorial", tracking: false, goto: false, cameraSupport: true, weight_kg: 1.9 },
  { id: "sw-esprit-100ed", brand: "Sky-Watcher", model: "Esprit 100ED", type: "Refractor", aperture_mm: 100, focal_length_mm: 550, mount: "German EQ", tracking: false, goto: false, cameraSupport: true, weight_kg: 6.3 },
  { id: "sw-startravel-120", brand: "Sky-Watcher", model: "Startravel 120", type: "Refractor", aperture_mm: 120, focal_length_mm: 600, mount: "Alt-Az", tracking: false, goto: false, cameraSupport: true, weight_kg: 5.5 },

  { id: "celestron-nexstar-8se", brand: "Celestron", model: "NexStar 8SE", type: "Schmidt-Cassegrain", aperture_mm: 203, focal_length_mm: 2032, mount: "Fork", tracking: true, goto: true, cameraSupport: true, weight_kg: 10.9 },
  { id: "celestron-nexstar-6se", brand: "Celestron", model: "NexStar 6SE", type: "Schmidt-Cassegrain", aperture_mm: 150, focal_length_mm: 1500, mount: "Fork", tracking: true, goto: true, cameraSupport: true, weight_kg: 9.5 },
  { id: "celestron-nexstar-130slt", brand: "Celestron", model: "NexStar 130SLT", type: "Reflector", aperture_mm: 130, focal_length_mm: 650, mount: "Alt-Az", tracking: true, goto: true, cameraSupport: true, weight_kg: 8.2 },
  { id: "celestron-astromaster-130eq", brand: "Celestron", model: "AstroMaster 130EQ", type: "Reflector", aperture_mm: 130, focal_length_mm: 650, mount: "German EQ", tracking: false, goto: false, cameraSupport: true, weight_kg: 12.7 },
  { id: "celestron-powerseeker-127eq", brand: "Celestron", model: "PowerSeeker 127EQ", type: "Reflector", aperture_mm: 127, focal_length_mm: 1000, mount: "German EQ", tracking: false, goto: false, cameraSupport: false, weight_kg: 9.7 },
  { id: "celestron-starsense-dx-130az", brand: "Celestron", model: "StarSense Explorer DX 130AZ", type: "Reflector", aperture_mm: 130, focal_length_mm: 650, mount: "Alt-Az", tracking: false, goto: false, cameraSupport: true, weight_kg: 8.2 },
  { id: "celestron-c6", brand: "Celestron", model: "C6", type: "Schmidt-Cassegrain", aperture_mm: 150, focal_length_mm: 1500, mount: "Custom", tracking: false, goto: false, cameraSupport: true, weight_kg: 4.5 },
  { id: "celestron-omni-xlt-150", brand: "Celestron", model: "Omni XLT 150", type: "Reflector", aperture_mm: 150, focal_length_mm: 750, mount: "German EQ", tracking: false, goto: false, cameraSupport: true, weight_kg: 12.0 },
  { id: "celestron-avx-8-edgehd", brand: "Celestron", model: "Advanced VX 8 EdgeHD", type: "Schmidt-Cassegrain", aperture_mm: 203, focal_length_mm: 2032, mount: "German EQ", tracking: true, goto: true, cameraSupport: true, weight_kg: 22.7 },
  { id: "celestron-evolution-925", brand: "Celestron", model: "NexStar Evolution 9.25", type: "Schmidt-Cassegrain", aperture_mm: 235, focal_length_mm: 2350, mount: "Alt-Az", tracking: true, goto: true, cameraSupport: true, weight_kg: 28.0 },
  { id: "celestron-firstscope-76", brand: "Celestron", model: "FirstScope 76", type: "Reflector", aperture_mm: 76, focal_length_mm: 300, mount: "Dobsonian", tracking: false, goto: false, cameraSupport: false, weight_kg: 2.0 },

  { id: "orion-xt8", brand: "Orion", model: "SkyQuest XT8", type: "Dobsonian", aperture_mm: 203, focal_length_mm: 1200, mount: "Dobsonian", tracking: false, goto: false, cameraSupport: true, weight_kg: 19.0 },
  { id: "orion-xt10", brand: "Orion", model: "SkyQuest XT10", type: "Dobsonian", aperture_mm: 254, focal_length_mm: 1200, mount: "Dobsonian", tracking: false, goto: false, cameraSupport: true, weight_kg: 25.4 },
  { id: "orion-xt45", brand: "Orion", model: "SkyQuest XT4.5", type: "Dobsonian", aperture_mm: 114, focal_length_mm: 900, mount: "Dobsonian", tracking: false, goto: false, cameraSupport: false, weight_kg: 8.2 },
  { id: "orion-starblast-6", brand: "Orion", model: "StarBlast 6", type: "Dobsonian", aperture_mm: 150, focal_length_mm: 750, mount: "Dobsonian", tracking: false, goto: false, cameraSupport: true, weight_kg: 10.9 },

  { id: "zwo-seestar-s50", brand: "ZWO", model: "Seestar S50", type: "Smart Telescope", aperture_mm: 50, focal_length_mm: 250, mount: "Alt-Az", tracking: true, goto: true, cameraSupport: true, weight_kg: 3.0 },
  { id: "vaonis-stellina", brand: "Vaonis", model: "Stellina", type: "Smart Telescope", aperture_mm: 80, focal_length_mm: 400, mount: "Alt-Az", tracking: true, goto: true, cameraSupport: true, weight_kg: 11.2 },
  { id: "unistellar-evscope-2", brand: "Unistellar", model: "eVscope 2", type: "Smart Telescope", aperture_mm: 114, focal_length_mm: 450, mount: "Alt-Az", tracking: true, goto: true, cameraSupport: true, weight_kg: 9.0 },

  { id: "apertura-ad8", brand: "Apertura", model: "AD8", type: "Dobsonian", aperture_mm: 203, focal_length_mm: 1200, mount: "Dobsonian", tracking: false, goto: false, cameraSupport: true, weight_kg: 20.0 },
  { id: "zhumell-z8", brand: "Zhumell", model: "Z8", type: "Dobsonian", aperture_mm: 203, focal_length_mm: 1200, mount: "Dobsonian", tracking: false, goto: false, cameraSupport: true, weight_kg: 22.0 },
  { id: "zhumell-z10", brand: "Zhumell", model: "Z10", type: "Dobsonian", aperture_mm: 254, focal_length_mm: 1250, mount: "Dobsonian", tracking: false, goto: false, cameraSupport: true, weight_kg: 27.0 },

  { id: "explore-scientific-ed80", brand: "Explore Scientific", model: "ED80", type: "Refractor", aperture_mm: 80, focal_length_mm: 480, mount: "Custom", tracking: false, goto: false, cameraSupport: true, weight_kg: 2.7 },
  { id: "wo-zenithstar-73", brand: "William Optics", model: "ZenithStar 73", type: "Refractor", aperture_mm: 73, focal_length_mm: 430, mount: "Custom", tracking: false, goto: false, cameraSupport: true, weight_kg: 2.0 },
  { id: "wo-gt81", brand: "William Optics", model: "GT81", type: "Refractor", aperture_mm: 81, focal_length_mm: 478, mount: "Custom", tracking: false, goto: false, cameraSupport: true, weight_kg: 2.5 },
  { id: "askar-fra400", brand: "Askar", model: "FRA400", type: "Refractor", aperture_mm: 72, focal_length_mm: 400, mount: "Custom", tracking: false, goto: false, cameraSupport: true, weight_kg: 2.3 },
  { id: "takahashi-fsq-85edx", brand: "Takahashi", model: "FSQ-85EDX", type: "Refractor", aperture_mm: 85, focal_length_mm: 450, mount: "Custom", tracking: false, goto: false, cameraSupport: true, weight_kg: 3.7 },

  { id: "meade-lx90", brand: "Meade", model: "LX90 8\"", type: "Schmidt-Cassegrain", aperture_mm: 203, focal_length_mm: 2000, mount: "Fork", tracking: true, goto: true, cameraSupport: true, weight_kg: 18.6 },
  { id: "meade-lx200-10", brand: "Meade", model: "LX200 10\"", type: "Schmidt-Cassegrain", aperture_mm: 254, focal_length_mm: 2500, mount: "Fork", tracking: true, goto: true, cameraSupport: true, weight_kg: 29.0 },
  { id: "meade-etx90", brand: "Meade", model: "ETX90", type: "Maksutov", aperture_mm: 90, focal_length_mm: 1250, mount: "Fork", tracking: true, goto: true, cameraSupport: true, weight_kg: 3.5 },

  { id: "bresser-messier-150", brand: "Bresser", model: "Messier NT-150", type: "Reflector", aperture_mm: 150, focal_length_mm: 750, mount: "German EQ", tracking: false, goto: false, cameraSupport: true, weight_kg: 15.0 },
  { id: "gso-rc8", brand: "GSO", model: "RC8", type: "Ritchey-Chretien", aperture_mm: 203, focal_length_mm: 1624, mount: "Custom", tracking: false, goto: false, cameraSupport: true, weight_kg: 7.7 },
];

export default DEMO_TELESCOPES;
