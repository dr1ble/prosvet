from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse

from app.modules.simulation.api.schemas import (
    SimulationDraftOut,
    SimulationDraftUpsertIn,
    SimulationLibraryCreateIn,
    SimulationLibraryItemOut,
    SimulationLibraryItemSummaryOut,
    SimulationLibraryListOut,
    SimulationMediaAppBindingListOut,
    SimulationMediaAssetOut,
    SimulationMediaAssetUpdateIn,
    SimulationMediaListOut,
    SimulationMediaUploadOut,
)
from app.modules.simulation.infra.models import SimulationMediaAsset
from app.shared.auth.deps import get_current_actor, require_policy
from app.shared.auth.schemas import CurrentActor
from app.shared.di.services import SimulationServiceDep

router = APIRouter()


def _to_media_asset_out(asset: SimulationMediaAsset) -> SimulationMediaAssetOut:
    return SimulationMediaAssetOut.model_validate(asset)


@router.get("/drafts/current", response_model=SimulationDraftOut | None)
def get_current_draft(
    service: SimulationServiceDep,
    actor: CurrentActor = Depends(require_policy("simulation.builder")),
    scope_key: str = Query(default="global", min_length=1, max_length=190),
) -> SimulationDraftOut | None:
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
    service: SimulationServiceDep,
    actor: CurrentActor = Depends(require_policy("simulation.builder")),
    scope_key: str = Query(default="global", min_length=1, max_length=190),
) -> SimulationDraftOut:
    if not isinstance(payload.payload_json, dict):
        raise HTTPException(status_code=422, detail="Поле payload_json должно быть JSON-объектом.")

    draft = service.upsert_current_draft(
        owner_user_id=actor.user_id,
        scope_key=scope_key,
        title=payload.title,
        payload_json=payload.payload_json,
    )
    return SimulationDraftOut.model_validate(draft)


@router.get("/media", response_model=SimulationMediaListOut)
def list_media_assets(
    service: SimulationServiceDep,
    actor: CurrentActor = Depends(require_policy("simulation.builder")),
    scope_key: str = Query(default="global", min_length=1, max_length=190),
    app_package_name: str = Query(min_length=3, max_length=255),
    store_type: str = Query(default="other", max_length=30),
    min_supported_version: str = Query(min_length=3, max_length=40),
    max_supported_version: str = Query(min_length=3, max_length=40),
    released_at: str | None = Query(default=None, max_length=20),
    search_query: str = Query(default="", max_length=120),
    limit: int = Query(default=40, ge=1, le=100),
) -> SimulationMediaListOut:
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
    return SimulationMediaListOut(items=[_to_media_asset_out(a) for a in assets])


@router.get("/media/apps", response_model=SimulationMediaAppBindingListOut)
def list_media_app_bindings(
    service: SimulationServiceDep,
    actor: CurrentActor = Depends(require_policy("simulation.builder")),
    scope_key: str = Query(default="global", min_length=1, max_length=190),
    search_query: str = Query(default="", max_length=120),
    limit: int = Query(default=40, ge=1, le=100),
) -> SimulationMediaAppBindingListOut:
    items = service.list_media_app_bindings(
        owner_user_id=actor.user_id,
        scope_key=scope_key,
        search_query=search_query,
        limit=limit,
    )
    return SimulationMediaAppBindingListOut(items=items)  # type: ignore[arg-type]


@router.post(
    "/media/upload",
    response_model=SimulationMediaUploadOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_media_asset(
    service: SimulationServiceDep,
    file: UploadFile = File(...),
    actor: CurrentActor = Depends(require_policy("simulation.builder")),
    scope_key: str = Query(default="global", min_length=1, max_length=190),
    app_package_name: str = Query(min_length=3, max_length=255),
    store_type: str = Query(default="other", max_length=30),
    min_supported_version: str = Query(min_length=3, max_length=40),
    max_supported_version: str = Query(min_length=3, max_length=40),
    released_at: str | None = Query(default=None, max_length=20),
) -> SimulationMediaUploadOut:
    if not file.filename:
        raise HTTPException(status_code=422, detail="Имя файла обязательно.")
    if not file.content_type:
        raise HTTPException(status_code=422, detail="Тип содержимого файла обязателен.")

    content = await file.read()
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

    return SimulationMediaUploadOut(asset=asset)  # type: ignore[arg-type]


@router.get("/media/{asset_id}/file")
def get_media_asset_file(
    asset_id: UUID,
    service: SimulationServiceDep,
    actor: CurrentActor = Depends(get_current_actor),
) -> FileResponse:
    asset_data = service.get_media_asset_with_path(
        asset_id=asset_id,
    )
    if asset_data is None:
        raise HTTPException(status_code=404, detail="Медиафайл не найден.")

    asset, file_path = asset_data
    return FileResponse(
        path=file_path,
        media_type=asset.content_type,
        filename=asset.original_filename,
    )


@router.patch("/media/{asset_id}", response_model=SimulationMediaAssetOut)
def update_media_asset(
    asset_id: UUID,
    payload: SimulationMediaAssetUpdateIn,
    service: SimulationServiceDep,
    actor: CurrentActor = Depends(require_policy("simulation.builder")),
) -> SimulationMediaAssetOut:
    try:
        asset = service.rename_media_asset(
            owner_user_id=actor.user_id,
            asset_id=asset_id,
            original_filename=payload.original_filename,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if asset is None:
        raise HTTPException(status_code=404, detail="Медиафайл не найден.")
    return SimulationMediaAssetOut.model_validate(asset)


@router.delete("/media/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media_asset(
    asset_id: UUID,
    service: SimulationServiceDep,
    actor: CurrentActor = Depends(require_policy("simulation.builder")),
) -> Response:
    deleted = service.delete_media_asset(owner_user_id=actor.user_id, asset_id=asset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Медиафайл не найден.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/library", response_model=SimulationLibraryListOut)
def list_library_items(
    service: SimulationServiceDep,
    actor: CurrentActor = Depends(require_policy("simulation.builder")),
    scope_key: str = Query(default="global", min_length=1, max_length=190),
    search_query: str = Query(default="", max_length=120),
    app_package_name: str | None = Query(default=None, min_length=3, max_length=255),
    store_type: str | None = Query(default=None, max_length=30),
    min_supported_version: str | None = Query(default=None, min_length=3, max_length=40),
    max_supported_version: str | None = Query(default=None, min_length=3, max_length=40),
    released_at: str | None = Query(default=None, max_length=20),
    limit: int = Query(default=40, ge=1, le=100),
) -> SimulationLibraryListOut:
    try:
        items = service.list_library_items(
            owner_user_id=actor.user_id,
            scope_key=scope_key,
            search_query=search_query,
            app_package_name=app_package_name,
            store_type=store_type,
            min_supported_version=min_supported_version,
            max_supported_version=max_supported_version,
            released_at=released_at,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return SimulationLibraryListOut(
        items=[SimulationLibraryItemSummaryOut.model_validate(item) for item in items]
    )


@router.post(
    "/library",
    response_model=SimulationLibraryItemOut,
    status_code=status.HTTP_201_CREATED,
)
def create_library_item(
    payload: SimulationLibraryCreateIn,
    service: SimulationServiceDep,
    actor: CurrentActor = Depends(require_policy("simulation.builder")),
    scope_key: str = Query(default="global", min_length=1, max_length=190),
) -> SimulationLibraryItemOut:
    try:
        item = service.create_library_item(
            owner_user_id=actor.user_id,
            scope_key=scope_key,
            title=payload.title,
            payload_json=payload.payload_json,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return SimulationLibraryItemOut.model_validate(item)


@router.get("/library/{item_id}", response_model=SimulationLibraryItemOut)
def get_library_item(
    item_id: UUID,
    service: SimulationServiceDep,
    actor: CurrentActor = Depends(require_policy("simulation.builder")),
) -> SimulationLibraryItemOut:
    item = service.get_library_item(owner_user_id=actor.user_id, item_id=item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Элемент библиотеки не найден.")
    return SimulationLibraryItemOut.model_validate(item)


@router.patch("/library/{item_id}", response_model=SimulationLibraryItemOut)
def update_library_item(
    item_id: UUID,
    payload: SimulationLibraryCreateIn,
    service: SimulationServiceDep,
    actor: CurrentActor = Depends(require_policy("simulation.builder")),
) -> SimulationLibraryItemOut:
    try:
        item = service.update_library_item(
            owner_user_id=actor.user_id,
            item_id=item_id,
            title=payload.title,
            payload_json=payload.payload_json,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if item is None:
        raise HTTPException(status_code=404, detail="Элемент библиотеки не найден.")
    return SimulationLibraryItemOut.model_validate(item)


@router.delete("/library/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_library_item(
    item_id: UUID,
    service: SimulationServiceDep,
    actor: CurrentActor = Depends(require_policy("simulation.builder")),
) -> Response:
    deleted = service.delete_library_item(owner_user_id=actor.user_id, item_id=item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Элемент библиотеки не найден.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
