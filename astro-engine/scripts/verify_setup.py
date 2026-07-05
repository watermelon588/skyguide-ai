"""Standalone environment verification for the Astro Engine.

Run from the astro-engine directory:

    venv/Scripts/python.exe scripts/verify_setup.py

Checks configuration, Astropy availability, a sample coordinate transform, and
MongoDB connectivity — without starting the web server. Exits non-zero on the
first hard failure so it can be used in CI.
"""

import asyncio
import sys
from pathlib import Path

# Allow running as a plain script: make the project root importable.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.astro import configure_astropy, verify_astropy  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.database import close_mongo_connection, connect_to_mongo  # noqa: E402


async def main() -> int:
    print(f"App        : {settings.APP_NAME} ({settings.APP_ENV})")
    print(f"API prefix : {settings.API_PREFIX}  v{settings.API_VERSION}")
    print(f"Database   : {settings.DATABASE_NAME}")

    configure_astropy()
    if not verify_astropy():
        print("[FAIL] Astropy verification failed")
        return 1
    print("[ OK ] Astropy import + sample transform")

    mongo_ok = await connect_to_mongo()
    await close_mongo_connection()
    print(f"[{' OK ' if mongo_ok else 'WARN'}] MongoDB ping{'' if mongo_ok else ' (engine still starts without it)'}")

    print("\nAstro Engine setup verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
