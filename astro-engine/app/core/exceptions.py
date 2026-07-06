"""Reusable exception handling.

Every error leaves the service in the SAME shape defined in API_SPEC.md:

    { "success": false, "message": "..." }

Python tracebacks are NEVER exposed to clients. Internal detail is logged
server-side and a safe message is returned.
"""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logging import get_logger

logger = get_logger(__name__)


class AstroEngineError(Exception):
    """Domain error raised by services with a client-safe message."""

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _error(message: str, status_code: int) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"success": False, "message": message})


def register_exception_handlers(app: FastAPI) -> None:
    """Attach the handlers to the FastAPI app."""

    @app.exception_handler(AstroEngineError)
    async def _handle_astro_error(_: Request, exc: AstroEngineError) -> JSONResponse:
        logger.warning("AstroEngineError: %s", exc.message)
        return _error(exc.message, exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def _handle_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Summarise the first validation issue in a readable way.
        errors = exc.errors()
        if errors:
            first = errors[0]
            location = " -> ".join(str(part) for part in first.get("loc", []) if part != "body")
            detail = first.get("msg", "Invalid input")
            message = f"Validation error at '{location}': {detail}" if location else detail
        else:
            message = "Invalid request payload."
        return _error(message, status.HTTP_422_UNPROCESSABLE_ENTITY)

    @app.exception_handler(Exception)
    async def _handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        # Full detail to the logs, generic message to the client.
        logger.exception("Unhandled exception: %s", exc)
        return _error("Internal server error.", status.HTTP_500_INTERNAL_SERVER_ERROR)