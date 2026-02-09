from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.modules.simulation.api.schemas import (
    SimulationDraftOut,
    SimulationDraftUpsertIn,
    SimulationMediaListOut,
    SimulationMediaUploadOut,
)
from app.modules.simulation.domain.services import SimulationService
from app.modules.users.models import UserRole
from app.shared.auth.deps import require_roles
from app.shared.auth.schemas import CurrentActor
from app.shared.db.deps import get_db

router = APIRouter()

simulation_builder_roles = (
    UserRole.ADMINISTRATOR,
    UserRole.METHODOLOGIST,
)


@router.get("/drafts/current", response_model=SimulationDraftOut | None)
def get_current_draft(
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(require_roles(*simulation_builder_roles)),
    scope_key: str = Query(default="global", min_length=1, max_length=190),
) -> SimulationDraftOut | None:
    service = SimulationService(db)
    draft = service.get_current_draft(owner_user_id=actor.user_id, scope_key=scope_key)
    if draft is None:
        return None
    return SimulationDraftOut.model_validate(draft)


@router.post(
    "/drafts/current",
    response_model=SimulationDraftOut,
    status_code=status.HTTP_200_OK,
)
def upsert_current_draft(
    payload: SimulationDraftUpsertIn,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(require_roles(*simulation_builder_roles)),
    scope_key: str = Query(default="global", min_length=1, max_length=190),
) -> SimulationDraftOut:
    if not isinstance(payload.payload_json, dict):
        raise HTTPException(status_code=422, detail="payload_json must be a JSON object")

    service = SimulationService(db)
    draft = service.upsert_current_draft(
        owner_user_id=actor.user_id,
        scope_key=scope_key,
        title=payload.title,
        payload_json=payload.payload_json,
    )
    return SimulationDraftOut.model_validate(draft)


@router.get("/media", response_model=SimulationMediaListOut)
def list_media_assets(
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(require_roles(*simulation_builder_roles)),
    scope_key: str = Query(default="global", min_length=1, max_length=190),
    app_package_name: str = Query(min_length=3, max_length=255),
    store_type: str = Query(default="other", max_length=30),
    min_supported_version: str = Query(min_length=3, max_length=40),
    max_supported_version: str = Query(min_length=3, max_length=40),
    released_at: str | None = Query(default=None, max_length=20),
    search_query: str = Query(default="", max_length=120),
    limit: int = Query(default=40, ge=1, le=100),
) -> SimulationMediaListOut:
    service = SimulationService(db)
    try:
        assets = service.list_media_assets(
            owner_user_id=actor.user_id,
            scope_key=scope_key,
            app_package_name=app_package_name,
            store_type=store_type,
            min_supported_version=min_supported_version,
            max_supported_version=max_supported_version,
            released_at=released_at,
            search_query=search_query,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return SimulationMediaListOut(items=assets)


@router.post(
    "/media/upload",
    response_model=SimulationMediaUploadOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_media_asset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(require_roles(*simulation_builder_roles)),
    scope_key: str = Query(default="global", min_length=1, max_length=190),
    app_package_name: str = Query(min_length=3, max_length=255),
    store_type: str = Query(default="other", max_length=30),
    min_supported_version: str = Query(min_length=3, max_length=40),
    max_supported_version: str = Query(min_length=3, max_length=40),
    released_at: str | None = Query(default=None, max_length=20),
) -> SimulationMediaUploadOut:
    if not file.filename:
        raise HTTPException(status_code=422, detail="File name is required.")
    if not file.content_type:
        raise HTTPException(status_code=422, detail="File content type is required.")

    content = await file.read()
    service = SimulationService(db)
    try:
        asset = service.create_media_asset(
            owner_user_id=actor.user_id,
            scope_key=scope_key,
            app_package_name=app_package_name,
            store_type=store_type,
            min_supported_version=min_supported_version,
            max_supported_version=max_supported_version,
            released_at=released_at,
            original_filename=file.filename,
            content_type=file.content_type,
            content=content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return SimulationMediaUploadOut(asset=asset)


@router.get("/media/{asset_id}/file")
def get_media_asset_file(
    asset_id: UUID,
    db: Session = Depends(get_db),
    actor: CurrentActor = Depends(require_roles(*simulation_builder_roles)),
) -> FileResponse:
    service = SimulationService(db)
    asset_data = service.get_media_asset_with_path(
        owner_user_id=actor.user_id,
        asset_id=asset_id,
    )
    if asset_data is None:
        raise HTTPException(status_code=404, detail="Media asset not found.")

    asset, file_path = asset_data
    return FileResponse(
        path=file_path,
        media_type=asset.content_type,
        filename=asset.original_filename,
    )
