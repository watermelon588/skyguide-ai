"""Catalog content: descriptions and imagery, derived from real data only.

Shared by ``seed_ngc_catalog.py`` and ``enrich_catalog.py``. Pure functions —
no network, no database, no astronomy. Import-safe and unit-testable.

Two problems this solves for ~13,000 objects:

**Descriptions.** Only ~200 deep-sky objects have anything written about them
anywhere. The rest are real, observable, and completely undocumented. Rather
than leave them blank (or invent prose about objects nobody has described), the
description is *composed from the object's own measured fields* — type,
constellation, magnitude, apparent size, morphology. Every clause is traceable
to a number in the catalog; a missing field drops its clause instead of guessing.
This is the same grounding rule the LLM brief follows (see groqService): state
facts we hold, never facts we'd like to hold.

**Imagery.** There is no photo library for 13,000 obscure galaxies, and stock art
would be a lie. But every object has coordinates, and CDS's hips2fits renders a
real cutout of *that patch of sky* from the DSS2 survey, framed to the object's
own angular size. It is a genuine image of the actual object, costs no storage,
and needs no API key. Notable objects are upgraded to real astrophotos by the
Wikipedia pass — see ``enrich_catalog.py``.
"""

# --------------------------------------------------------------------------- #
# Imagery
# --------------------------------------------------------------------------- #

#: CDS hips2fits — renders a HiPS survey cutout at arbitrary coordinates.
HIPS2FITS = "https://alasky.cds.unistra.fr/hips-image-services/hips2fits"

#: DSS2 colour: the widest all-sky optical coverage with real colour. Every
#: object in this catalog is inside it, which is what makes one URL scheme work
#: for the whole catalog.
HIPS_SURVEY = "CDS/P/DSS2/color"

#: Thumbnail (square, list/grid use) and hero (the target panel's 16:9 band).
THUMB_PX = 400
HERO_W, HERO_H = 1200, 675

#: Framing bounds in degrees. The floor stops a 0.3′ galaxy from being rendered
#: at absurd magnification (DSS has ~1″ plate resolution — there is nothing to
#: see below this); the ceiling keeps a 3° object like the Andromeda Galaxy from
#: pulling down a needlessly enormous cutout.
MIN_FOV_DEG = 0.12
MAX_FOV_DEG = 3.0

#: Multiple of the object's major axis to show, so it sits in context with sky
#: around it rather than jammed against the frame edge.
FRAMING_FACTOR = 2.2


def frame_fov_deg(angular_size_arcmin: float | None) -> float:
    """Degrees of sky to render for an object of this apparent size.

    Objects with no recorded size (14% of OpenNGC) get the floor — a sensible
    "small object" field rather than no image at all.
    """
    if not angular_size_arcmin or angular_size_arcmin <= 0:
        return MIN_FOV_DEG
    fov = (angular_size_arcmin / 60.0) * FRAMING_FACTOR
    return max(MIN_FOV_DEG, min(MAX_FOV_DEG, fov))


def _hips_url(ra_deg: float, dec_deg: float, fov_deg: float, width: int, height: int) -> str:
    # hips2fits applies `fov` to the LARGEST dimension, so a 16:9 request must
    # scale fov by the aspect ratio for the object to still fit vertically.
    aspect = max(1.0, width / height)
    return (
        f"{HIPS2FITS}?hips={HIPS_SURVEY.replace('/', '%2F')}"
        f"&width={width}&height={height}"
        f"&fov={round(fov_deg * aspect, 4)}"
        f"&projection=TAN&coordsys=icrs"
        f"&ra={round(ra_deg, 6)}&dec={round(dec_deg, 6)}"
        f"&format=jpg"
    )


def sky_survey_media(
    ra_deg: float | None, dec_deg: float | None, angular_size_arcmin: float | None
) -> dict:
    """Real DSS2 cutouts of this object, as URLs. ``{}`` without coordinates."""
    if ra_deg is None or dec_deg is None:
        return {"thumbnail": None, "hero_image": None}

    fov = frame_fov_deg(angular_size_arcmin)
    return {
        "thumbnail": _hips_url(ra_deg, dec_deg, fov, THUMB_PX, THUMB_PX),
        "hero_image": _hips_url(ra_deg, dec_deg, fov, HERO_W, HERO_H),
    }


# --------------------------------------------------------------------------- #
# Morphology
# --------------------------------------------------------------------------- #

#: Hubble class prefix -> plain English.
#:
#: CASE IS MEANING, and this list is ORDER-SENSITIVE — do not sort it and do not
#: upper-case the code. In Hubble notation the capitals carry the family and the
#: lowercase suffix carries arm-tightness, so:
#:
#:     "Sb"  = spiral, type b          (UNBARRED — 3,663 objects here)
#:     "SBb" = Barred spiral, type b   (barred    — 1,369 objects here)
#:
#: Matching case-insensitively collapses those two into one and mislabels every
#: unbarred spiral in the catalog, Andromeda included. First match wins, so the
#: specific prefixes must precede the general ones ("S0" before "S", "E-S0"
#: before "E"). The suffix letters are deliberately ignored — they encode detail
#: no visual observer can use.
_HUBBLE_PREFIXES = (
    ("E-S0", "elliptical/lenticular"),
    ("SAB", "weakly barred spiral"),
    ("SB", "barred spiral"),
    ("SA", "spiral"),
    ("S0", "lenticular"),
    ("S", "spiral"),
    ("IAB", "irregular"),
    ("IB", "barred irregular"),
    ("I", "irregular"),
    ("E", "elliptical"),
)


def morphology(hubble: str | None) -> str | None:
    """'SBc' -> 'barred spiral', 'Sb' -> 'spiral'. None when unclassified."""
    if not hubble:
        return None
    code = hubble.strip()
    if not code:
        return None
    for prefix, label in _HUBBLE_PREFIXES:
        if code.startswith(prefix):  # case-sensitive on purpose — see above
            return label
    return None


# --------------------------------------------------------------------------- #
# Observing difficulty — derived from magnitude, not invented
# --------------------------------------------------------------------------- #

#: (faintest magnitude, difficulty, what it takes). Naked-eye limit is ~6 in a
#: dark sky; ~9.5 is a 50mm binocular's reach; ~12 suits a 4–6" telescope;
#: beyond that you need real aperture. Bands are conventional amateur practice.
_DIFFICULTY_BANDS = (
    (6.0, "Easy", "visible to the unaided eye from a dark site"),
    (9.5, "Easy", "an easy binocular target"),
    (12.0, "Moderate", "within reach of a small telescope"),
    (14.0, "Hard", "needs a 6-inch or larger telescope"),
    # No internal dash: this phrase gets appended after an em-dash, and two in
    # one sentence reads like a stutter.
    (99.0, "Expert", "a faint challenge needing large aperture and a dark sky"),
)


def difficulty_for(magnitude: float | None) -> tuple[str | None, str | None]:
    """(difficulty, reach phrase) for a magnitude. (None, None) if unmeasured.

    Unmeasured must NOT default to "Expert": ~19% of OpenNGC has no magnitude at
    all, and labelling those Expert would invent a fact about every one of them.
    """
    if magnitude is None:
        return None, None
    for limit, difficulty, phrase in _DIFFICULTY_BANDS:
        if magnitude < limit:
            return difficulty, phrase
    return "Expert", _DIFFICULTY_BANDS[-1][2]


# --------------------------------------------------------------------------- #
# Description
# --------------------------------------------------------------------------- #

def _article(word: str) -> str:
    return "an" if word[:1].lower() in "aeiou" else "a"


def _size_phrase(arcmin: float | None) -> str | None:
    """Apparent size in the unit an observer thinks in."""
    if not arcmin or arcmin <= 0:
        return None
    if arcmin < 1.0:
        return f"{round(arcmin * 60)}″ across"
    if arcmin >= 60.0:
        return f"{arcmin / 60:.1f}° across"
    return f"{arcmin:.1f}′ across"


def compose_description(
    *,
    display_name: str,
    object_type: str | None,
    constellation: str | None,
    magnitude: float | None,
    angular_size_arcmin: float | None,
    hubble: str | None = None,
) -> str:
    """A factual description built from this object's own measurements.

    Every clause is dropped when its field is missing, so the sentence degrades
    from "NGC 253 is a barred spiral galaxy in Sculptor. It shines at magnitude
    8.0 and is 27.7′ across — an easy binocular target." down to "NGC 4321 is a
    galaxy." — shorter, but never wrong.
    """
    kind = (object_type or "object").lower()

    # Morphology qualifies galaxies only; a "barred spiral globular cluster"
    # would be nonsense, and OpenNGC does carry stray Hubble codes on non-galaxies.
    shape = morphology(hubble) if "galaxy" in kind else None
    subject = f"{shape} {kind}" if shape else kind

    identity = f"{display_name} is {_article(subject)} {subject}"
    if constellation:
        identity += f" in {constellation}"
    identity += "."

    facts = []
    if magnitude is not None:
        facts.append(f"shines at magnitude {magnitude:g}")
    size = _size_phrase(angular_size_arcmin)
    if size:
        facts.append(f"is {size}")

    if not facts:
        return identity

    _, reach = difficulty_for(magnitude)
    sentence = "It " + " and ".join(facts)
    if reach:
        sentence += f" — {reach}"
    return f"{identity} {sentence}."


def observation_tips(
    *,
    object_type: str | None,
    magnitude: float | None,
    angular_size_arcmin: float | None,
) -> list[str]:
    """Practical, derived tips. Only rules that follow from the numbers."""
    tips: list[str] = []
    kind = (object_type or "").lower()

    _, reach = difficulty_for(magnitude)
    if reach:
        tips.append(f"At magnitude {magnitude:g}, this is {reach}.")

    if angular_size_arcmin:
        if angular_size_arcmin >= 60:
            tips.append(
                "Larger than the full Moon — use your lowest power and widest "
                "field, or you will look straight through it."
            )
        elif angular_size_arcmin <= 2:
            tips.append(
                "Small and tight: find it at low power, then push the magnification "
                "up hard once it is centred."
            )

    if "galaxy" in kind or "nebula" in kind:
        tips.append(
            "Surface brightness is the enemy, not magnitude — go on a moonless "
            "night and give your eyes 20 minutes to adapt."
        )
    if "globular" in kind:
        tips.append("Aperture is what resolves the core into stars; try 150× and up.")
    if "planetary nebula" in kind:
        tips.append("An O-III or narrowband filter lifts it out of the background.")

    return tips
