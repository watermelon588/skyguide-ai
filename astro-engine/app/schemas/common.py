"""Shared response schemas.

Follows the SkyGuide response contract (API_SPEC.md):

    success:  { "success": true,  "message": "...", "data": {...} }
    error:    { "success": false, "message": "..." }
"""

from typing import Any

from pydantic import BaseModel, Field


class SuccessResponse(BaseModel):
    success: bool = True
    message: str = "Operation completed successfully."
    data: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    success: bool = False
    message: str = Field(examples=["Something went wrong."])
