"""Astropy runtime setup and availability verification.

Two responsibilities:

1. Disable IERS auto-download. Astropy normally fetches Earth-orientation data
   from the internet the first time a high-precision coordinate transform runs.
   That network call can hang or fail inside a request. We ship
   ``astropy-iers-data`` as a dependency, so we force offline behaviour and let
   Astropy fall back to bundled data (a small accuracy trade-off that is
   irrelevant for visibility-grade alt/az calculations).

2. ``verify_astropy()`` performs a real import + a trivial calculation so the
   health endpoint can report Astropy as genuinely functional, not merely
   installed.
"""

from app.core.logging import get_logger

logger = get_logger(__name__)


def configure_astropy() -> None:
    """Configure Astropy for offline, deterministic operation."""
    import logging

    from astropy.utils.iers import conf as iers_conf

    iers_conf.auto_download = False
    # Do not raise if a requested time is outside the bundled IERS range;
    # fall back to the nearest available data instead.
    iers_conf.auto_max_age = None
    # Now that astropy is imported (and its custom logger class installed), it is
    # safe to quiet its logger. Doing this earlier would break astropy startup.
    logging.getLogger("astropy").setLevel(logging.WARNING)
    logger.info("Astropy Loaded -> IERS auto-download disabled (offline mode)")


def verify_astropy() -> bool:
    """Return True if Astropy imports and a basic transform succeeds."""
    try:
        import astropy.units as u
        from astropy.coordinates import AltAz, EarthLocation, SkyCoord
        from astropy.time import Time

        location = EarthLocation(lat=0 * u.deg, lon=0 * u.deg, height=0 * u.m)
        target = SkyCoord(ra=0 * u.deg, dec=0 * u.deg, frame="icrs")
        target.transform_to(AltAz(obstime=Time("2020-01-01T00:00:00"), location=location))
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Astropy verification failed: %s", exc)
        return False
