"""Alignment ephemeris service — the astronomy behind realtime alignment.

The realtime alignment loop lives on the Express gateway (it owns the
Socket.IO rooms and the 20Hz orientation stream). This service supplies the
SCIENCE: for an observer and an ICRS target it computes the current
horizontal position (Alt/Az) plus its instantaneous angular drift rates.

The rates let the gateway extrapolate the target's position linearly between
refreshes — sidereal motion is ≤ ~0.005°/s away from the zenith, so a linear
segment stays well under 0.01° of error over its validity window. All Astropy
work stays here; the gateway never does coordinate astronomy.

Pure functions, no FastAPI/database awareness — same rules as
``coordinate_service`` (this module builds on it).
"""

import astropy.units as u
import numpy as np
from astropy.coordinates import AltAz, SkyCoord
from astropy.time import Time

from app.services import coordinate_service

# Finite-difference step for the drift rates. Long enough that the angle
# difference dominates float noise, short enough to be a true local slope.
EPHEMERIS_STEP_S = 30.0

# How long the gateway may extrapolate before it should re-request. Azimuth
# rate can grow quickly for targets crossing near the zenith, so the window
# shrinks as the rate rises (see _validity_window).
EPHEMERIS_MAX_VALID_S = 120.0
EPHEMERIS_MIN_VALID_S = 15.0


def _circular_delta_deg(a: float, b: float) -> float:
    """Signed shortest angular difference a−b in degrees, wrapped to ±180."""
    d = (a - b) % 360.0
    if d > 180.0:
        d -= 360.0
    return d


def _validity_window(az_rate_deg_s: float) -> float:
    """Shrink the extrapolation window when azimuth is moving fast.

    Budget: keep linear-extrapolation error ≲ 0.05° across the window.
    """
    rate = abs(az_rate_deg_s)
    if rate <= 0:
        return EPHEMERIS_MAX_VALID_S
    window = 0.05 / rate  # seconds until the (worst-case) budget is spent
    return float(np.clip(window, EPHEMERIS_MIN_VALID_S, EPHEMERIS_MAX_VALID_S))


def compute_ephemeris(
    ra_deg: float,
    dec_deg: float,
    latitude: float,
    longitude: float,
    elevation: float = 0.0,
    time: Time | None = None,
) -> dict:
    """Alt/Az of an ICRS target for an observer, with angular drift rates.

    A single vectorised transform evaluates the target at ``t0`` and
    ``t0 + EPHEMERIS_STEP_S``; the rates are the finite differences
    (azimuth difference taken on the circle, so a north-crossing target
    doesn't produce a ±360°/step spike).
    """
    t0 = time if time is not None else Time.now()
    times = t0 + np.array([0.0, EPHEMERIS_STEP_S]) * u.s

    location = coordinate_service.create_observer(latitude, longitude, elevation)
    target = SkyCoord(ra=ra_deg * u.deg, dec=dec_deg * u.deg, frame="icrs")
    altaz = target.transform_to(AltAz(obstime=times, location=location))

    alt = altaz.alt.to(u.deg).value
    az = altaz.az.to(u.deg).value

    alt_rate = (float(alt[1]) - float(alt[0])) / EPHEMERIS_STEP_S
    az_rate = _circular_delta_deg(float(az[1]), float(az[0])) / EPHEMERIS_STEP_S

    altitude = float(alt[0])
    return {
        "utc_time": t0.isot,
        "altitude_deg": round(altitude, 5),
        "azimuth_deg": round(float(az[0]), 5),
        "altitude_rate_deg_s": round(alt_rate, 8),
        "azimuth_rate_deg_s": round(az_rate, 8),
        "valid_for_s": round(_validity_window(az_rate), 1),
        "above_horizon": altitude > 0,
    }
