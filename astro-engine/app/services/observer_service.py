"""Observer service.

Turns raw observer parameters (as they will later arrive from the Express
gateway) into an Astropy ``EarthLocation`` plus derived, JSON-serialisable
observer state. Delegates all coordinate maths to ``coordinate_service`` so the
astronomy logic lives in exactly one place.
"""

import astropy.units as u
from astropy.coordinates import EarthLocation
from astropy.time import Time

from app.services import coordinate_service


def build_observer(
    latitude: float,
    longitude: float,
    elevation: float = 0.0,
) -> EarthLocation:
    """Construct an ``EarthLocation`` for the given observer."""
    return coordinate_service.create_observer(latitude, longitude, elevation)


def describe_observer(
    latitude: float,
    longitude: float,
    elevation: float = 0.0,
    timezone: str | None = None,
    time: Time | None = None,
) -> dict:
    """Build the observer and return a serialisable snapshot of its state.

    Used by the observer test endpoint to verify EarthLocation + Astropy
    integration end-to-end.
    """
    t = time if time is not None else Time.now()
    location = build_observer(latitude, longitude, elevation)
    lst = coordinate_service.current_sidereal_time(location, t)

    geocentric = location.geocentric  # (x, y, z) as Quantities

    return {
        "observer": {
            "latitude_deg": latitude,
            "longitude_deg": longitude,
            "elevation_m": elevation,
            "timezone": timezone,
            "geocentric_x_m": float(geocentric[0].to(u.m).value),
            "geocentric_y_m": float(geocentric[1].to(u.m).value),
            "geocentric_z_m": float(geocentric[2].to(u.m).value),
        },
        "utc_time": t.isot,
        "local_sidereal_time": lst.to_string(unit=u.hourangle, sep=":", precision=2, pad=True),
        "local_sidereal_time_hours": float(lst.hourangle),
    }
