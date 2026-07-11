"""Coordinate service — the reusable astronomy core.

Pure Astropy functions with NO FastAPI / HTTP / database awareness, so they can
be reused by the visibility engine, recommendation engine, catalog queries, and
tests alike. Every function is independent and side-effect free.

Scientific conventions
-----------------------
- Celestial targets use the ICRS (equatorial RA/DEC) frame.
- The observer is an ``EarthLocation``; horizontal coordinates use the ``AltAz``
  frame (altitude above horizon, azimuth measured East of North).
- Sidereal time is 'apparent' Local Sidereal Time (includes nutation).
- Hour Angle = Local Sidereal Time − Right Ascension, wrapped to (-180, +180].

IERS auto-download is disabled globally in ``app.core.astro`` so these calls are
offline-safe and deterministic.
"""

from collections.abc import Sequence

import astropy.units as u
import numpy as np
from astropy.coordinates import AltAz, Angle, EarthLocation, SkyCoord
from astropy.time import Time


def create_observer(latitude: float, longitude: float, elevation: float = 0.0) -> EarthLocation:
    """Build an ``EarthLocation`` from geodetic coordinates.

    latitude/longitude in degrees, elevation in metres.
    """
    return EarthLocation(
        lat=latitude * u.deg,
        lon=longitude * u.deg,
        height=elevation * u.m,
    )


def current_sidereal_time(location: EarthLocation, time: Time | None = None) -> Angle:
    """Apparent Local Sidereal Time at the observer's longitude."""
    t = time if time is not None else Time.now()
    return t.sidereal_time("apparent", longitude=location.lon)


def calculate_lst(longitude_deg: float, time: Time | None = None) -> Angle:
    """Apparent Local Sidereal Time for a bare longitude (degrees)."""
    t = time if time is not None else Time.now()
    return t.sidereal_time("apparent", longitude=longitude_deg * u.deg)


def equatorial_to_horizontal(
    ra_deg: float,
    dec_deg: float,
    location: EarthLocation,
    time: Time | None = None,
) -> SkyCoord:
    """Transform equatorial RA/DEC (ICRS) to horizontal Alt/Az for the observer.

    Returns a ``SkyCoord`` in the ``AltAz`` frame — access ``.alt`` and ``.az``.
    """
    t = time if time is not None else Time.now()
    target = SkyCoord(ra=ra_deg * u.deg, dec=dec_deg * u.deg, frame="icrs")
    return target.transform_to(AltAz(obstime=t, location=location))


def horizontal_to_equatorial(
    alt_deg: float,
    az_deg: float,
    location: EarthLocation,
    time: Time | None = None,
) -> SkyCoord:
    """Transform horizontal Alt/Az back to equatorial ICRS RA/DEC.

    Returns a ``SkyCoord`` in the ICRS frame — access ``.ra`` and ``.dec``.
    """
    t = time if time is not None else Time.now()
    altaz = SkyCoord(
        alt=alt_deg * u.deg,
        az=az_deg * u.deg,
        frame=AltAz(obstime=t, location=location),
    )
    return altaz.transform_to("icrs")


def hour_angle(
    ra_deg: float,
    location: EarthLocation,
    time: Time | None = None,
) -> Angle:
    """Hour Angle of a target = LST − RA, wrapped to (-180, +180] degrees.

    Negative = target is east of the meridian (rising);
    positive = west of the meridian (setting); ~0 = transit.
    """
    lst = current_sidereal_time(location, time)
    ha = (lst - ra_deg * u.deg).to(u.deg)
    return Angle(ha).wrap_at(180 * u.deg)


# --------------------------------------------------------------------------- #
# Vectorised variants — transform many targets in a single Astropy call.
# Used by the visibility engine to process the whole catalog efficiently.
# --------------------------------------------------------------------------- #
def equatorial_to_horizontal_batch(
    ra_deg: Sequence[float] | np.ndarray,
    dec_deg: Sequence[float] | np.ndarray,
    location: EarthLocation,
    time: Time | None = None,
) -> SkyCoord:
    """Transform arrays of RA/DEC (ICRS) to horizontal Alt/Az in one call.

    Returns a vectorised ``SkyCoord`` in the ``AltAz`` frame; ``.alt`` and
    ``.az`` are arrays aligned with the inputs.
    """
    t = time if time is not None else Time.now()
    targets = SkyCoord(
        ra=np.asarray(ra_deg, dtype=float) * u.deg,
        dec=np.asarray(dec_deg, dtype=float) * u.deg,
        frame="icrs",
    )
    return targets.transform_to(AltAz(obstime=t, location=location))


def hour_angle_batch(
    ra_deg: Sequence[float] | np.ndarray,
    location: EarthLocation,
    time: Time | None = None,
) -> Angle:
    """Hour Angle for an array of RA values = LST − RA, wrapped to (-180, +180]."""
    lst = current_sidereal_time(location, time)
    ha = (lst - np.asarray(ra_deg, dtype=float) * u.deg).to(u.deg)
    return Angle(ha).wrap_at(180 * u.deg)


# --------------------------------------------------------------------------- #
# Derived observing quantities — airmass, separations, rise/transit/set.
# --------------------------------------------------------------------------- #

#: Standard rise/set horizon: 34' of atmospheric refraction lifts objects into
#: view while they are geometrically below the horizon.
RISE_SET_HORIZON_DEG = -0.5667

#: Hour Angle advances 360° per sidereal day (23.9344696 civil hours).
_HA_DEG_PER_CIVIL_HOUR = 360.0 / 23.9344696


def airmass_batch(altitude_deg: Sequence[float] | np.ndarray) -> np.ndarray:
    """Relative airmass for altitudes (deg) — Kasten & Young (1989).

    Accurate through the full range down to the horizon (~38 at 0°), unlike the
    plane-parallel ``sec z``. Altitudes at or below 0° return ``np.nan`` (the
    formula has no meaning underground).
    """
    alt = np.asarray(altitude_deg, dtype=float)
    with np.errstate(invalid="ignore"):
        am = 1.0 / (
            np.sin(np.radians(alt)) + 0.50572 * np.power(alt + 6.07995, -1.6364)
        )
    return np.where(alt > 0.0, am, np.nan)


def angular_separation_altaz_batch(
    alt1_deg: Sequence[float] | np.ndarray,
    az1_deg: Sequence[float] | np.ndarray,
    alt2_deg: float,
    az2_deg: float,
) -> np.ndarray:
    """Great-circle separation (deg) between horizontal positions.

    Computed directly in the Alt/Az frame so it is genuinely topocentric —
    important for the Moon, whose parallax shifts it up to ~1° against the
    stars depending on where on Earth you stand.
    """
    a1 = np.radians(np.asarray(alt1_deg, dtype=float))
    z1 = np.radians(np.asarray(az1_deg, dtype=float))
    a2 = np.radians(alt2_deg)
    z2 = np.radians(az2_deg)
    cos_sep = np.sin(a1) * np.sin(a2) + np.cos(a1) * np.cos(a2) * np.cos(z1 - z2)
    return np.degrees(np.arccos(np.clip(cos_sep, -1.0, 1.0)))


def rise_transit_set_batch(
    ra_deg: Sequence[float] | np.ndarray,
    dec_deg: Sequence[float] | np.ndarray,
    location: EarthLocation,
    time: Time | None = None,
    horizon_deg: float = RISE_SET_HORIZON_DEG,
) -> dict:
    """Next rise, transit and set for fixed RA/DEC targets — analytic and
    vectorised (classic hour-angle method, e.g. Meeus ch. 15).

    The semi-diurnal arc H0 satisfies
        cos H0 = (sin h0 − sin φ sin δ) / (cos φ cos δ)
    where h0 is the refraction-corrected horizon. Each event is "hours from
    ``time`` until the target's Hour Angle next reaches −H0 (rise), 0
    (transit) or +H0 (set)", converted at the sidereal rate.

    Returns a dict of aligned arrays:
        rise / transit / set : ``Time`` values (via ``time + hours``)
        hours_to_set         : float hours until the next set (np.nan if none)
        circumpolar          : never sets from this latitude
        never_rises          : never clears the horizon from this latitude

    For circumpolar targets rise/set are meaningless (transit still returned);
    for never-risers all three are meaningless. Callers gate on the flags.
    Precision is a minute or two (ignores refraction variation and the tiny
    sidereal/civil drift across the interval) — ample for HH:MM display.
    """
    t = time if time is not None else Time.now()
    lat_rad = float(location.lat.rad)
    dec_rad = np.radians(np.asarray(dec_deg, dtype=float))
    h0_rad = np.radians(horizon_deg)

    with np.errstate(divide="ignore", invalid="ignore"):
        cos_h0 = (np.sin(h0_rad) - np.sin(lat_rad) * np.sin(dec_rad)) / (
            np.cos(lat_rad) * np.cos(dec_rad)
        )
    circumpolar = cos_h0 < -1.0
    never_rises = cos_h0 > 1.0
    semi_arc_deg = np.degrees(np.arccos(np.clip(cos_h0, -1.0, 1.0)))

    ha_deg = np.asarray(hour_angle_batch(ra_deg, location, t).deg, dtype=float)

    def hours_until_ha(target_ha_deg: np.ndarray | float) -> np.ndarray:
        """Civil hours until HA next reaches ``target_ha_deg`` (always forward)."""
        delta = np.mod(np.asarray(target_ha_deg) - ha_deg, 360.0)
        return delta / _HA_DEG_PER_CIVIL_HOUR

    hours_to_transit = hours_until_ha(0.0)
    hours_to_rise = hours_until_ha(-semi_arc_deg)
    hours_to_set = hours_until_ha(semi_arc_deg)

    return {
        "rise": t + hours_to_rise * u.hour,
        "transit": t + hours_to_transit * u.hour,
        "set": t + hours_to_set * u.hour,
        "hours_to_set": np.where(circumpolar | never_rises, np.nan, hours_to_set),
        "circumpolar": circumpolar,
        "never_rises": never_rises,
    }
