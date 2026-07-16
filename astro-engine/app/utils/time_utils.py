"""Time parsing & formatting helpers built on ``astropy.time.Time``.

All astronomy calculations operate in UTC. These helpers turn an optional ISO
string (as received from an API request) into an Astropy ``Time`` object (or
default to the current instant), and format computed instants for API output
— shared by the Moon, visibility and satellite engines so local-time handling
lives in exactly one place.
"""

from datetime import timezone as _tz
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from astropy.time import Time

from app.core.exceptions import AstroEngineError
from app.core.logging import get_logger

logger = get_logger(__name__)


def parse_time(value: str | None) -> Time:
    """Parse an ISO-8601 string into an Astropy UTC ``Time``.

    Returns the current time when ``value`` is ``None``. Raises
    ``AstroEngineError`` (422-friendly) for an unparseable string rather than
    leaking an Astropy/ValueError traceback.
    """
    if value is None:
        return Time.now()
    try:
        return Time(value, format="isot", scale="utc")
    except Exception:  # noqa: BLE001 - astropy raises a variety of types
        try:
            # Be lenient with a space separator instead of 'T'.
            return Time(value, scale="utc")
        except Exception as exc:  # noqa: BLE001
            raise AstroEngineError(
                f"Invalid time '{value}'. Expected ISO-8601 UTC, e.g. '2026-07-05T20:30:00'.",
                status_code=422,
            ) from exc


def resolve_timezone(timezone: str | None):
    """Return a ``tzinfo`` for an IANA name, falling back to UTC when unknown."""
    if not timezone:
        return _tz.utc
    try:
        return ZoneInfo(timezone)
    except (ZoneInfoNotFoundError, ValueError):
        logger.warning("Unknown timezone '%s' — times reported in UTC", timezone)
        return _tz.utc


def local_hhmm(t: Time | None, tzinfo) -> str | None:
    """Format an Astropy ``Time`` as 'HH:MM' in ``tzinfo`` (None passes through).

    Coerces to the UTC scale first — times from Skyfield arrive in TT, and
    ``to_datetime`` refuses a timezone on any other scale.
    """
    if t is None:
        return None
    dt = t.utc.to_datetime(timezone=_tz.utc).astimezone(tzinfo)
    return dt.strftime("%H:%M")


def local_hhmm_batch(times: Time, tzinfo) -> list[str | None]:
    """Vectorised ``local_hhmm`` for a whole ``Time`` array.

    ``Time.to_datetime`` is an ERFA conversion; doing it per element (once per
    object, three times over) dominated ``/visibility/observable`` once the
    catalog grew — thousands of individually-slow calls. Converting the whole
    array in ONE call and then doing the cheap pure-Python tz-shift per element
    turns seconds back into milliseconds.
    """
    import numpy as np

    if times is None:
        return []
    datetimes = np.atleast_1d(times.utc.to_datetime(timezone=_tz.utc))
    return [dt.astimezone(tzinfo).strftime("%H:%M") for dt in datetimes]


def iso_utc(t: Time | None) -> str | None:
    """Format an Astropy ``Time`` as an ISO-8601 UTC string with 'Z' suffix."""
    if t is None:
        return None
    return t.utc.isot + "Z"
