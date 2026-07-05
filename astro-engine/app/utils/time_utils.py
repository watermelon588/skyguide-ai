"""Time parsing helpers built on ``astropy.time.Time``.

All astronomy calculations operate in UTC. These helpers turn an optional ISO
string (as received from an API request) into an Astropy ``Time`` object, or
default to the current instant.
"""

from astropy.time import Time

from app.core.exceptions import AstroEngineError


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
