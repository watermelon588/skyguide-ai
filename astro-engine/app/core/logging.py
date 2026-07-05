"""Structured logging configuration for the Astro Engine.

A single ``configure_logging()`` call sets up a consistent, timestamped format
for the whole service. Modules obtain a namespaced logger via ``get_logger``.

Never log secrets, tokens, connection strings, or user passwords.
"""

import logging
import sys

from app.core.config import settings

_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_configured = False


def configure_logging() -> None:
    """Configure the root logger. Safe to call multiple times."""
    global _configured
    if _configured:
        return

    level = logging.INFO if settings.is_production else logging.DEBUG

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(fmt=_LOG_FORMAT, datefmt=_DATE_FORMAT))

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)

    # Third-party libraries are noisy at DEBUG — keep them at WARNING.
    # NOTE: do NOT touch the "astropy" logger here. Astropy installs a custom
    # Logger subclass on import; pre-creating a plain "astropy" logger before
    # astropy is imported breaks its initialisation. Astropy's own log level is
    # set in app.core.astro.configure_astropy() after import.
    for noisy in ("urllib3", "pymongo", "httpx", "httpcore", "asyncio"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    _configured = True


def get_logger(name: str) -> logging.Logger:
    """Return a namespaced logger, e.g. ``get_logger(__name__)``."""
    return logging.getLogger(name)
