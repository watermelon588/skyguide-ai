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
