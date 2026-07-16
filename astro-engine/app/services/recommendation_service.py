"""Personalized recommendation engine (Feature 8, Phase A).

Moves from "objectively best tonight" (visibility_service's score) to "best
for YOU tonight": the geometric ranking stays the foundation, and explainable,
deterministic adjustments are layered on top —

    aperture feasibility  can your scope even show it?
    field-of-view fit     does it fit the eyepiece, or overflow it?
    novelty               seen it recently? skipped it twice?
    window quality        does it stay up after full darkness?

plus a **best observing window** per object (the intersection of the object's
up-time with tonight's astronomical darkness, peaking at transit) and a
`reasons` list in plain English for every applied judgement — transparency is
the product.

Stateless by design: telescope and history arrive in the request (the gateway
owns user data); the engine never reads user collections. Every adjustment is
a module constant so Phase C's learned ranker can replace the weights without
touching the plumbing.

Orchestrates, never reimplements: geometry comes from visibility_service /
coordinate_service; sky brightness from sky_quality_service (best-effort).
"""

import math
from datetime import datetime, timezone as _tz

import numpy as np
from astropy import units as u
from astropy.coordinates import AltAz, get_body
from astropy.time import Time

from app.core.logging import get_logger
from app.services import (
    catalog_service,
    coordinate_service,
    observer_service,
    sky_quality_service,
    visibility_service,
)
from app.utils.time_utils import local_hhmm, resolve_timezone

logger = get_logger(__name__)

# --------------------------------------------------------------------------
# Tunables — Phase C replaces these with learned weights, same interface.
# --------------------------------------------------------------------------

#: Ideal-sky limiting magnitude for an aperture (classic 2.7 + 5 log10(D_mm)).
LIMITING_MAG_BASE = 2.7
#: Magnitudes of limiting-mag lost per Bortle class above 4 (sky brightness).
BORTLE_MAG_LOSS = 0.5

#: Assumed eyepiece for FOV fit when only focal length is known: 25 mm, 50°
#: apparent field -> true FOV (arcmin) = 60 * 50 * 25 / focal_length_mm.
EYEPIECE_FOV_ARCMIN = 75000.0

ADJ_TOO_FAINT_MAX = -35.0        # object beyond the scope's limit (graded)
ADJ_NEAR_LIMIT = -8.0            # within 1.5 mag of the limit
ADJ_EASY_TARGET = +8.0           # ≥4 mag of headroom
ADJ_OVERFLOWS_FOV = -12.0        # larger than the eyepiece's true field
ADJ_FRAMES_WELL = +6.0           # fills 15–80% of the field
ADJ_OBSERVED_RECENT = -18.0      # observed just now, decaying to 0 at 60 days
NOVELTY_DECAY_DAYS = 60.0
ADJ_SKIPPED_TWICE = -15.0
ADJ_NEW_TO_YOU = +5.0
ADJ_NO_DARK_WINDOW = -20.0       # sets before astronomical darkness
ADJ_LONG_WINDOW = +4.0           # ≥3 h of dark up-time

TOP_VARIETY_COUNT = 10           # diversify this many head-of-list slots

_COMPASS8 = ["north", "northeast", "east", "southeast",
             "south", "southwest", "west", "northwest"]


def _compass(azimuth_deg: float) -> str:
    return _COMPASS8[round(azimuth_deg / 45.0) % 8]


#: Candidate-pool magnitude cap when no telescope is known: naked-eye through
#: small-telescope range. Keeps the pool to a few thousand of the objects a
#: user might realistically observe, instead of scanning the whole 13k catalog.
DEFAULT_CANDIDATE_MAG = 12.0
#: Hard ceiling so a huge aperture can't reopen the full-catalog scan.
MAX_CANDIDATE_MAG = 15.0


def candidate_magnitude_cap(telescope: dict | None) -> float:
    """Faintest magnitude worth loading as a recommendation candidate.

    Derived from the scope's aperture (its ideal limiting magnitude, plus a
    magnitude of headroom so near-limit challenge objects still surface), capped
    so the candidate pool stays small and the query stays fast. Without a
    telescope, a sensible naked-eye-to-small-scope default. This bounds the
    expensive path: the pipeline used to transform every up-object in the sky
    (~8k at 13k catalog size) and reload all 13k full documents; now it only
    ever touches objects the observer could plausibly see.
    """
    aperture = (telescope or {}).get("aperture_mm")
    if not aperture:
        return DEFAULT_CANDIDATE_MAG
    limiting = LIMITING_MAG_BASE + 5.0 * math.log10(float(aperture))
    return min(limiting + 1.0, MAX_CANDIDATE_MAG)


# --------------------------------------------------------------------------
# Tonight's darkness window
# --------------------------------------------------------------------------

def _darkness_window(location, t: Time) -> tuple[float, float, str] | None:
    """Tonight's darkness as (start_h, end_h) in hours from ``t``.

    Astronomical darkness (sun < -18°) when it exists; high-latitude summers
    fall back to nautical (-12°), flagged in the returned label. None when the
    sun never gets meaningfully below the horizon at all.
    """
    sun = get_body("sun", t)
    for horizon, label in ((-18.0, "astronomical"), (-12.0, "nautical")):
        events = coordinate_service.rise_transit_set_batch(
            [sun.ra.deg], [sun.dec.deg], location, t, horizon_deg=horizon
        )
        if bool(events["circumpolar"][0]):
            continue  # sun never sinks below this depth — try shallower
        if bool(events["never_rises"][0]):
            return 0.0, 24.0, label  # polar night: dark the whole period

        dawn_h = float((events["rise"][0] - t).to_value(u.hour))
        dusk_h = float((events["set"][0] - t).to_value(u.hour))
        # Forward-looking crossings: dawn before dusk means we are inside the
        # dark interval right now.
        if dawn_h < dusk_h:
            return 0.0, dawn_h, label
        return dusk_h, dawn_h, label
    return None


def _best_window(
    set_h: float | None,
    transit_h: float,
    circumpolar: bool,
    dark: tuple[float, float, str] | None,
) -> dict | None:
    """Intersect an object's up-time with the darkness window.

    All values are hours from "now". Every recommended object is above the
    horizon at request time, so its up-interval is [0, set_h] (circumpolar:
    all night). Peak = transit clamped into the window; a transit more than
    ~12 h out means tonight's transit already happened — the object is
    descending, so the window opens at its highest point.
    """
    if dark is None:
        return None
    dark_start, dark_end, _ = dark

    up_end = dark_end if circumpolar else min(set_h, dark_end)
    start = dark_start
    if up_end <= start:
        return None  # sets before darkness falls

    if transit_h <= start:
        peak = start
    elif transit_h <= up_end:
        peak = transit_h
    elif transit_h <= up_end + 12.0:
        peak = up_end        # still climbing all window; best at the end
    else:
        peak = start         # transit was earlier tonight; best at the start

    return {"start_h": start, "peak_h": peak, "end_h": up_end}


# --------------------------------------------------------------------------
# History normalisation
# --------------------------------------------------------------------------

def _parse_history(history: dict | None, now: Time) -> tuple[dict, dict]:
    """-> ({catalog_id: days_ago}, {catalog_id: skip_count})."""
    observed_days: dict[str, float] = {}
    skip_counts: dict[str, int] = {}
    if not history:
        return observed_days, skip_counts

    now_dt = now.to_datetime(timezone=_tz.utc)
    for entry in history.get("observed") or []:
        cid = str(entry.get("id", "")).upper()
        if not cid:
            continue
        days = float("inf")
        at = entry.get("at")
        if at:
            try:
                seen = datetime.fromisoformat(str(at).replace("Z", "+00:00"))
                if seen.tzinfo is None:
                    seen = seen.replace(tzinfo=_tz.utc)
                days = max(0.0, (now_dt - seen).total_seconds() / 86400.0)
            except ValueError:
                pass
        observed_days[cid] = min(days, observed_days.get(cid, float("inf")))

    for cid in history.get("skipped") or []:
        cid = str(cid).upper()
        skip_counts[cid] = skip_counts.get(cid, 0) + 1

    return observed_days, skip_counts


# --------------------------------------------------------------------------
# The engine
# --------------------------------------------------------------------------

def _variety_pass(ranked: list[dict], top_n: int) -> list[dict]:
    """Round-robin the head of the list across object types so the top is
    never five globulars in a row. Order within a type is preserved; the tail
    keeps its plain score order."""
    head, tail = ranked[:top_n], ranked[top_n:]
    by_type: dict[str, list[dict]] = {}
    type_order: list[str] = []
    for obj in head:
        kind = obj.get("object_type") or "Other"
        if kind not in by_type:
            by_type[kind] = []
            type_order.append(kind)
        by_type[kind].append(obj)

    mixed: list[dict] = []
    while len(mixed) < len(head):
        for kind in type_order:
            if by_type[kind]:
                mixed.append(by_type[kind].pop(0))
    return mixed + tail


async def compute_recommendations(
    latitude: float,
    longitude: float,
    elevation: float = 0.0,
    timezone: str | None = None,
    time: Time | None = None,
    telescope: dict | None = None,
    history: dict | None = None,
    limit: int = 10,
) -> dict:
    t = time if time is not None else Time.now()
    telescope = telescope or {}

    # Bound the candidate pool to what the observer's scope could plausibly show.
    # Without this the pipeline scans every up-object in a 13k catalog (tens of
    # seconds); with it, only the few thousand relevant ones.
    max_magnitude = candidate_magnitude_cap(telescope)

    visibility = await visibility_service.compute_observable(
        latitude=latitude,
        longitude=longitude,
        elevation=elevation,
        timezone=timezone,
        time=t,
        max_magnitude=max_magnitude,
    )
    objects = visibility["objects"]

    # The personal layers need each object's physical data (magnitude, size) and
    # coordinates. Load them LEAN and magnitude-filtered — the same projected,
    # bounded set the visibility call used, not all 13k full documents.
    docs = await catalog_service.load_visibility_candidates(max_magnitude=max_magnitude)
    physical = {d["catalog_id"]: d.get("physical", {}) for d in docs}

    location = observer_service.build_observer(latitude, longitude, elevation)
    tzinfo = resolve_timezone(timezone)

    # --- observer context ---------------------------------------------------
    bortle = telescope.get("bortle_scale")
    sky = await sky_quality_service.sample(latitude, longitude)
    if bortle is None and sky is not None:
        bortle = sky["bortle"]

    aperture = telescope.get("aperture_mm")
    focal_length = telescope.get("focal_length_mm")

    limiting_mag = None
    if aperture:
        limiting_mag = LIMITING_MAG_BASE + 5.0 * math.log10(float(aperture))
        if bortle is not None and bortle > 4:
            limiting_mag -= (bortle - 4) * BORTLE_MAG_LOSS

    fov_arcmin = EYEPIECE_FOV_ARCMIN / float(focal_length) if focal_length else None

    dark = _darkness_window(location, t)
    observed_days, skip_counts = _parse_history(history, t)

    # Fresh rise/transit/set as forward-hours (the visibility payload has them
    # only as display strings) — one vectorised call for the whole list.
    doc_by_id = {d["catalog_id"]: d for d in docs}
    ra = np.array(
        [doc_by_id[o["catalog_id"]]["coordinates"]["ra_deg"] for o in objects],
        dtype=float,
    ) if objects else np.array([])
    dec = np.array(
        [doc_by_id[o["catalog_id"]]["coordinates"]["dec_deg"] for o in objects],
        dtype=float,
    ) if objects else np.array([])

    if objects:
        events = coordinate_service.rise_transit_set_batch(ra, dec, location, t)
        transit_h = (events["transit"] - t).to_value(u.hour)
        set_h = (events["set"] - t).to_value(u.hour)
        circumpolar = events["circumpolar"]

    recommended: list[dict] = []
    for i, obj in enumerate(objects):
        cid = obj["catalog_id"]
        phys = physical.get(cid, {})
        magnitude = phys.get("magnitude")
        size_arcmin = phys.get("angular_size_arcmin")

        base = obj["visibility_score"]
        adjustments = {"aperture": 0.0, "fov": 0.0, "novelty": 0.0, "window": 0.0}
        reasons: list[str] = []

        # -- geometry reasons (already priced into the base score) -----------
        if obj["altitude_deg"] >= 60:
            reasons.append("High overhead — the sharpest view")
        elif obj["altitude_deg"] >= 30:
            reasons.append(f"Well placed in the {_compass(obj['azimuth_deg'])}")
        if obj.get("moon_penalty", 0) >= 0.15:
            reasons.append("Moonlight will wash it out somewhat")
        elif obj.get("moon_separation_deg") is not None and obj["moon_separation_deg"] >= 90:
            reasons.append("Far from the Moon's glare")

        # -- aperture feasibility --------------------------------------------
        if limiting_mag is not None and magnitude is not None:
            margin = limiting_mag - float(magnitude)
            if margin < 0:
                adjustments["aperture"] = max(ADJ_TOO_FAINT_MAX, margin * 10.0)
                reasons.append(
                    f"Likely too faint for your {int(aperture)} mm aperture"
                )
            elif margin < 1.5:
                adjustments["aperture"] = ADJ_NEAR_LIMIT
                reasons.append("Near your scope's limit — a challenge object")
            elif margin >= 4:
                adjustments["aperture"] = ADJ_EASY_TARGET
                reasons.append(f"Bright and easy in your {int(aperture)} mm scope")

        # -- field-of-view fit -------------------------------------------------
        if fov_arcmin is not None and size_arcmin:
            ratio = float(size_arcmin) / fov_arcmin
            if ratio > 1.0:
                adjustments["fov"] = ADJ_OVERFLOWS_FOV
                reasons.append("Wider than your eyepiece's view — expect a section, not the whole")
            elif 0.15 <= ratio <= 0.8:
                adjustments["fov"] = ADJ_FRAMES_WELL
                reasons.append("Frames nicely in your eyepiece")

        # -- novelty -----------------------------------------------------------
        if history:
            days_ago = observed_days.get(cid)
            if days_ago is not None and days_ago < NOVELTY_DECAY_DAYS:
                fade = 1.0 - days_ago / NOVELTY_DECAY_DAYS
                adjustments["novelty"] = ADJ_OBSERVED_RECENT * fade
                reasons.append(f"You logged this {int(days_ago)} day(s) ago")
            elif skip_counts.get(cid, 0) >= 2:
                adjustments["novelty"] = ADJ_SKIPPED_TWICE
                reasons.append("You've passed on this twice")
            elif days_ago is None:
                adjustments["novelty"] = ADJ_NEW_TO_YOU
                reasons.append("New to you")

        # -- best window --------------------------------------------------------
        # Ranking depends only on whether a dark window exists and how long it is
        # — both cheap. The window's PEAK ALTITUDE needs a per-object astropy
        # transform at that object's own peak time, which at ~875 up-objects cost
        # ~9 s (the dominant cost of the whole endpoint). Since only the returned
        # top-N are ever shown, the peak-altitude/HH:MM payload is deferred until
        # after ranking and slicing (see below) and computed for those alone.
        window = _best_window(
            None if bool(circumpolar[i]) else float(set_h[i]),
            float(transit_h[i]),
            bool(circumpolar[i]),
            dark,
        )
        if window is None:
            adjustments["window"] = ADJ_NO_DARK_WINDOW
            reasons.append("Sets before the sky gets fully dark")
        elif (window["end_h"] - window["start_h"]) >= 3.0:
            adjustments["window"] = ADJ_LONG_WINDOW
            reasons.append("Up for hours after dark")

        score = int(round(max(0.0, min(100.0, base + sum(adjustments.values())))))
        recommended.append({
            **obj,
            "recommendation_score": score,
            "reasons": reasons,
            # Raw window + this object's sky index, resolved into `best_window`
            # once we know which objects survive ranking.
            "_window": window,
            "_ra": float(ra[i]),
            "_dec": float(dec[i]),
            "score_breakdown": {
                "base": base,
                **{k: round(v, 1) for k, v in adjustments.items()},
            },
        })

    recommended.sort(
        key=lambda o: (-o["recommendation_score"], -o["visibility_score"], o["catalog_id"])
    )
    recommended = _variety_pass(recommended, min(TOP_VARIETY_COUNT, len(recommended)))
    recommended = recommended[: max(1, min(limit, 50))]

    # Now — and only now, for the handful of objects actually being returned —
    # compute each best window's peak altitude and local times. One astropy
    # transform per returned object (≤50) instead of one per up-object (~875).
    for obj in recommended:
        window = obj.pop("_window")
        ra_i, dec_i = obj.pop("_ra"), obj.pop("_dec")
        if window is None:
            obj["best_window"] = None
            continue
        peak_time = t + window["peak_h"] * u.hour
        peak_altaz = coordinate_service.equatorial_to_horizontal_batch(
            [ra_i], [dec_i], location, peak_time
        )
        obj["best_window"] = {
            "start": local_hhmm(t + window["start_h"] * u.hour, tzinfo),
            "peak": local_hhmm(peak_time, tzinfo),
            "end": local_hhmm(t + window["end_h"] * u.hour, tzinfo),
            "duration_hours": round(window["end_h"] - window["start_h"], 1),
            "peak_altitude_deg": round(float(peak_altaz.alt.deg[0]), 1),
        }

    darkness_payload = None
    if dark is not None:
        darkness_payload = {
            "start": local_hhmm(t + dark[0] * u.hour, tzinfo),
            "end": local_hhmm(t + dark[1] * u.hour, tzinfo),
            "kind": dark[2],
        }

    logger.info(
        "Recommendations -> %d objects (aperture=%s bortle=%s history=%s)",
        len(recommended), aperture, bortle, bool(history),
    )

    return {
        "observer": visibility["observer"],
        "utc_time": visibility["utc_time"],
        "moon": visibility["moon"],
        "sky_quality": sky,
        "darkness": darkness_payload,
        "telescope_used": {
            "aperture_mm": aperture,
            "focal_length_mm": focal_length,
            "bortle_scale": bortle,
            "limiting_magnitude": round(limiting_mag, 1) if limiting_mag else None,
            "eyepiece_fov_arcmin": round(fov_arcmin, 0) if fov_arcmin else None,
        },
        "model": "heuristic-v1",
        "objects": recommended,
    }
