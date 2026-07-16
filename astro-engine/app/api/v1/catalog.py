"""Celestial catalog endpoints.

    GET /api/v1/catalog                 list with pagination + filters
    GET /api/v1/catalog/search?q=orion  search by name / alias / catalog id
    GET /api/v1/catalog/{catalog_id}    single object (e.g. M42)

Read-only. The catalog is populated offline by the seeder script — the API
never queries astroquery on request.
"""

from fastapi import APIRouter, Query

from app.core.exceptions import AstroEngineError
from app.schemas.catalog import CatalogListResponse, CatalogObjectResponse
from app.schemas.common import SuccessResponse
from app.services import catalog_service

router = APIRouter()


def _pagination(page: int, limit: int, total: int) -> dict:
    total_pages = (total + limit - 1) // limit if limit else 0
    return {
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }


@router.get("", response_model=CatalogListResponse, summary="List catalog objects")
@router.get("/", response_model=CatalogListResponse, include_in_schema=False)
async def list_objects(
    page: int = Query(1, ge=1, description="1-based page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    catalog: str | None = Query(None, description="Filter by catalog, e.g. 'Messier'"),
    type: str | None = Query(None, description="Filter by object type, e.g. 'Galaxy'"),
    constellation: str | None = Query(None, description="Filter by constellation, e.g. 'Orion'"),
    q: str | None = Query(None, description="Search name / alias / catalog id"),
    sort: str = Query(
        "catalog_id",
        pattern="^(catalog_id|magnitude)$",
        description="Ordering: 'catalog_id' (default) or 'magnitude' (brightest first)",
    ),
) -> CatalogListResponse:
    objects, total = await catalog_service.get_all_objects(
        page=page,
        limit=limit,
        catalog=catalog,
        object_type=type,
        constellation=constellation,
        q=q,
        sort=sort,
    )
    return CatalogListResponse(
        message="Catalog objects retrieved successfully.",
        data={"objects": objects, "pagination": _pagination(page, limit, total)},
    )


@router.get("/search", response_model=SuccessResponse, summary="Search catalog")
async def search(
    q: str = Query(..., min_length=1, description="Search term (name, alias or catalog id)"),
    limit: int = Query(20, ge=1, le=100),
) -> SuccessResponse:
    results = await catalog_service.search_objects(q, limit=limit)
    return SuccessResponse(
        message=f"Found {len(results)} object(s) matching '{q}'.",
        data={"query": q, "count": len(results), "objects": results},
    )


@router.get("/stats", response_model=SuccessResponse, summary="Catalog statistics")
async def stats() -> SuccessResponse:
    """Aggregate counts (by catalog/type/constellation/magnitude) for the
    Explore page's charts. Declared before ``/{catalog_id}`` so the literal
    'stats' path is not captured as an object id."""
    data = await catalog_service.get_catalog_stats()
    return SuccessResponse(message="Catalog statistics.", data=data)


@router.get("/{catalog_id}", response_model=CatalogObjectResponse, summary="Get object by id")
async def get_object(catalog_id: str) -> CatalogObjectResponse:
    obj = await catalog_service.get_object_by_catalog_id(catalog_id)
    if obj is None:
        raise AstroEngineError("Object not found.", status_code=404)
    return CatalogObjectResponse(message="Object retrieved successfully.", data=obj)
