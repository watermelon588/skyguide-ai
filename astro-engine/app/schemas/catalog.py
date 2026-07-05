"""Celestial catalog schemas.

Mirrors the ``celestial_objects`` document shape (see the seeder). Fields that
are populated in later sessions are optional / nullable here so the schema never
needs a breaking change as content is enriched.
"""

from typing import Any

from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    ra_deg: float
    dec_deg: float


class Physical(BaseModel):
    distance_ly: float | None = None
    magnitude: float | None = None
    angular_size_arcmin: float | None = None


class Classification(BaseModel):
    difficulty: str | None = None
    season: str | None = None


class Content(BaseModel):
    short_description: str | None = None
    ai_description: str | None = None
    observation_tips: list[str] = Field(default_factory=list)
    recommended_telescopes: list[str] = Field(default_factory=list)


class Media(BaseModel):
    thumbnail: str | None = None
    hero_image: str | None = None


class CelestialObject(BaseModel):
    id: str
    catalog: str
    catalog_id: str
    name: str | None = None
    aliases: list[str] = Field(default_factory=list)
    object_type: str | None = None
    constellation: str | None = None
    coordinates: Coordinates
    physical: Physical
    classification: Classification
    content: Content
    media: Media
    metadata: dict[str, Any]


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class CatalogListData(BaseModel):
    objects: list[CelestialObject]
    pagination: PaginationMeta


class CatalogListResponse(BaseModel):
    success: bool = True
    message: str = "Catalog objects retrieved successfully."
    data: CatalogListData


class CatalogObjectResponse(BaseModel):
    success: bool = True
    message: str = "Object retrieved successfully."
    data: CelestialObject
