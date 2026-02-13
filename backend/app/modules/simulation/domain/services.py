import re
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.simulation.infra.models import (
    SimulationDraft,
    SimulationLibraryItem,
    SimulationMediaAsset,
)
from app.modules.simulation.infra.repository import (
    SimulationMediaAppBinding,
    SimulationRepository,
)

DEFAULT_SCOPE_KEY = "global"
ALLOWED_STORE_TYPES = {"play_market", "rustore", "app_store", "other"}
ALLOWED_IMAGE_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}
PACKAGE_PATTERN = re.compile(r"^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)+$")
VERSION_PATTERN = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


def normalize_scope_key(scope_key: str) -> str:
    normalized = scope_key.strip()
    if not normalized:
        return DEFAULT_SCOPE_KEY
    return normalized[:190]


def _scope_to_folder(scope_key: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]+", "_", scope_key.strip())
    safe = safe.strip("_")
    return safe or DEFAULT_SCOPE_KEY


def _normalize_store_type(value: str) -> str:
    normalized = value.strip()
    if normalized in ALLOWED_STORE_TYPES:
        return normalized
    raise ValueError("Unsupported store_type. Use play_market, rustore, app_store, or other.")


def _normalize_package_name(value: str) -> str:
    normalized = value.strip()
    if not PACKAGE_PATTERN.match(normalized):
        raise ValueError("Invalid app_package_name. Expected value like com.example.app.")
    return normalized[:255]


def _parse_semver(value: str) -> tuple[int, int, int]:
    normalized = value.strip()
    match = VERSION_PATTERN.match(normalized)
    if not match:
        raise ValueError("Version must use X.Y.Z format.")
    return (int(match.group(1)), int(match.group(2)), int(match.group(3)))


def _normalize_release_date(value: str | None) -> date | None:
    if value is None:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    try:
        return date.fromisoformat(normalized)
    except ValueError as exc:
        raise ValueError("released_at must use YYYY-MM-DD format.") from exc


def _normalize_media_filename(value: str) -> str:
    normalized = value.strip().replace("/", "_").replace("\\", "_")
    normalized = normalized.replace("\x00", "")
    if not normalized:
        raise ValueError("original_filename is required.")
    return normalized[:255]


def _extract_library_metadata(
    title: str | None,
    payload_json: dict,
) -> tuple[str, str | None]:
    raw_title = (title or "").strip()
    payload_title = str(payload_json.get("title", "")).strip()
    normalized_title = (raw_title or payload_title or "Simulation snapshot")[:255]

    target_app_name: str | None = None
    raw_target_app = payload_json.get("targetApp")
    if isinstance(raw_target_app, dict):
        raw_app_name = raw_target_app.get("appName")
        if isinstance(raw_app_name, str):
            next_target_app_name = raw_app_name.strip()
            if next_target_app_name:
                target_app_name = next_target_app_name[:255]

    return normalized_title, target_app_name


@dataclass(frozen=True)
class SimulationLibraryBinding:
    app_package_name: str
    store_type: str
    min_supported_version: str
    max_supported_version: str
    released_at: date | None
    icon_url: str | None


@dataclass(frozen=True)
class SimulationLibrarySummary:
    id: UUID
    owner_user_id: UUID
    scope_key: str
    title: str
    target_app_name: str | None
    binding: SimulationLibraryBinding | None
    screens_count: int
    links_count: int
    created_at: datetime
    updated_at: datetime
    payload_json: dict[str, Any]


def _extract_library_binding(payload_json: dict[str, Any]) -> SimulationLibraryBinding | None:
    raw_target_app = payload_json.get("targetApp")
    if not isinstance(raw_target_app, dict):
        return None

    raw_package_name = raw_target_app.get("packageName")
    raw_store_type = raw_target_app.get("storeType")
    raw_min_version = raw_target_app.get("minSupportedVersion")
    raw_max_version = raw_target_app.get("maxSupportedVersion")
    raw_released_at = raw_target_app.get("releasedAt")
    raw_icon_url = raw_target_app.get("iconUrl")

    if not (
        isinstance(raw_package_name, str)
        and isinstance(raw_store_type, str)
        and isinstance(raw_min_version, str)
        and isinstance(raw_max_version, str)
    ):
        return None

    package_name = raw_package_name.strip()
    store_type = raw_store_type.strip()
    min_version = raw_min_version.strip()
    max_version = raw_max_version.strip()

    if not package_name or not store_type or not min_version or not max_version:
        return None

    try:
        normalized_store_type = _normalize_store_type(store_type)
    except ValueError:
        normalized_store_type = "other"

    released_at: date | None = None
    if isinstance(raw_released_at, str):
        stripped_released_at = raw_released_at.strip()
        if stripped_released_at:
            try:
                released_at = date.fromisoformat(stripped_released_at)
            except ValueError:
                released_at = None

    icon_url = raw_icon_url.strip()[:500] if isinstance(raw_icon_url, str) and raw_icon_url.strip() else None

    return SimulationLibraryBinding(
        app_package_name=package_name[:255],
        store_type=normalized_store_type,
        min_supported_version=min_version[:40],
        max_supported_version=max_version[:40],
        released_at=released_at,
        icon_url=icon_url,
    )


def _count_library_links(payload_json: dict[str, Any]) -> int:
    links_count = 0
    raw_screens = payload_json.get("screens")
    if not isinstance(raw_screens, list):
        return 0

    for raw_screen in raw_screens:
        if not isinstance(raw_screen, dict):
            continue
        raw_hotspots = raw_screen.get("hotspots")
        if not isinstance(raw_hotspots, list):
            continue
        for raw_hotspot in raw_hotspots:
            if not isinstance(raw_hotspot, dict):
                continue
            raw_target = raw_hotspot.get("targetScreenId")
            if isinstance(raw_target, str) and raw_target.strip():
                links_count += 1
    return links_count


class SimulationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = SimulationRepository(db)

    def get_current_draft(
        self,
        owner_user_id: UUID,
        scope_key: str,
    ) -> SimulationDraft | None:
        normalized_scope = normalize_scope_key(scope_key)
        return self.repo.get_current_by_owner(owner_user_id, normalized_scope)

    def upsert_current_draft(
        self,
        owner_user_id: UUID,
        scope_key: str,
        title: str,
        payload_json: dict,
    ) -> SimulationDraft:
        normalized_scope = normalize_scope_key(scope_key)
        normalized_title = title.strip() or "Simulation draft"
        current = self.repo.get_current_by_owner(owner_user_id, normalized_scope)

        if current is None:
            draft = self.repo.create_draft(
                owner_user_id=owner_user_id,
                scope_key=normalized_scope,
                title=normalized_title,
                payload_json=payload_json,
            )
            self.db.commit()
            return draft

        draft = self.repo.update_draft(
            draft=current,
            title=normalized_title,
            payload_json=payload_json,
        )
        self.db.commit()
        return draft

    def list_media_assets(
        self,
        owner_user_id: UUID,
        scope_key: str,
        app_package_name: str,
        store_type: str,
        min_supported_version: str,
        max_supported_version: str,
        released_at: str | None,
        search_query: str,
        limit: int,
    ) -> list[SimulationMediaAsset]:
        normalized_scope = normalize_scope_key(scope_key)
        normalized_package = _normalize_package_name(app_package_name)
        normalized_store_type = _normalize_store_type(store_type)
        min_semver = _parse_semver(min_supported_version)
        max_semver = _parse_semver(max_supported_version)
        if min_semver > max_semver:
            raise ValueError(
                "min_supported_version must be less than or equal to max_supported_version."
            )
        normalized_min_version = min_supported_version.strip()[:40]
        normalized_max_version = max_supported_version.strip()[:40]
        normalized_released_at = _normalize_release_date(released_at)
        normalized_limit = max(1, min(limit, 100))
        return self.repo.list_media_assets(
            owner_user_id=owner_user_id,
            scope_key=normalized_scope,
            app_package_name=normalized_package,
            store_type=normalized_store_type,
            min_supported_version=normalized_min_version,
            max_supported_version=normalized_max_version,
            released_at=normalized_released_at,
            search_query=search_query,
            limit=normalized_limit,
        )

    def list_media_app_bindings(
        self,
        owner_user_id: UUID,
        scope_key: str,
        search_query: str,
        limit: int,
    ) -> list[SimulationMediaAppBinding]:
        normalized_scope = normalize_scope_key(scope_key)
        normalized_limit = max(1, min(limit, 100))
        return self.repo.list_media_app_bindings(
            owner_user_id=owner_user_id,
            scope_key=normalized_scope,
            search_query=search_query,
            limit=normalized_limit,
        )

    def create_media_asset(
        self,
        owner_user_id: UUID,
        scope_key: str,
        app_package_name: str,
        store_type: str,
        min_supported_version: str,
        max_supported_version: str,
        released_at: str | None,
        original_filename: str,
        content_type: str,
        content: bytes,
    ) -> SimulationMediaAsset:
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise ValueError("Unsupported image content type.")

        if not content:
            raise ValueError("Image file is empty.")

        max_bytes = max(1, settings.simulation_media_max_mb) * 1024 * 1024
        if len(content) > max_bytes:
            raise ValueError(f"Image exceeds size limit ({settings.simulation_media_max_mb} MB).")

        normalized_scope = normalize_scope_key(scope_key)
        normalized_package = _normalize_package_name(app_package_name)
        normalized_store_type = _normalize_store_type(store_type)
        min_semver = _parse_semver(min_supported_version)
        max_semver = _parse_semver(max_supported_version)
        if min_semver > max_semver:
            raise ValueError(
                "min_supported_version must be less than or equal to max_supported_version."
            )
        normalized_min_version = min_supported_version.strip()[:40]
        normalized_max_version = max_supported_version.strip()[:40]
        normalized_released_at = _normalize_release_date(released_at)
        safe_scope = _scope_to_folder(normalized_scope)
        extension = ALLOWED_IMAGE_TYPES[content_type]
        safe_name = original_filename.strip() or f"image.{extension}"
        safe_name = _normalize_media_filename(safe_name)
        storage_root = Path(settings.simulation_media_dir).resolve()
        target_dir = storage_root / str(owner_user_id) / safe_scope
        target_dir.mkdir(parents=True, exist_ok=True)

        storage_filename = f"{uuid4().hex}.{extension}"
        storage_path = target_dir / storage_filename
        storage_key = f"{owner_user_id}/{safe_scope}/{storage_filename}"
        storage_path.write_bytes(content)

        try:
            asset = self.repo.create_media_asset(
                owner_user_id=owner_user_id,
                scope_key=normalized_scope,
                app_package_name=normalized_package,
                store_type=normalized_store_type,
                min_supported_version=normalized_min_version,
                max_supported_version=normalized_max_version,
                released_at=normalized_released_at,
                original_filename=safe_name,
                storage_key=storage_key,
                content_type=content_type,
                size_bytes=len(content),
            )
            self.db.commit()
        except Exception:
            if storage_path.exists():
                storage_path.unlink(missing_ok=True)
            raise
        return asset

    def get_media_asset_with_path(
        self,
        asset_id: UUID,
    ) -> tuple[SimulationMediaAsset, Path] | None:
        asset = self.repo.get_media_asset_public(asset_id=asset_id)
        if asset is None:
            return None

        storage_root = Path(settings.simulation_media_dir).resolve()
        file_path = storage_root / asset.storage_key
        if not file_path.exists() or not file_path.is_file():
            return None
        return asset, file_path

    def rename_media_asset(
        self,
        owner_user_id: UUID,
        asset_id: UUID,
        original_filename: str,
    ) -> SimulationMediaAsset | None:
        asset = self.repo.get_media_asset_by_id(
            owner_user_id=owner_user_id,
            asset_id=asset_id,
        )
        if asset is None:
            return None

        normalized_filename = _normalize_media_filename(original_filename)
        updated = self.repo.update_media_asset_filename(
            asset=asset,
            original_filename=normalized_filename,
        )
        self.db.commit()
        return updated

    def delete_media_asset(
        self,
        owner_user_id: UUID,
        asset_id: UUID,
    ) -> bool:
        asset = self.repo.get_media_asset_by_id(
            owner_user_id=owner_user_id,
            asset_id=asset_id,
        )
        if asset is None:
            return False

        storage_root = Path(settings.simulation_media_dir).resolve()
        file_path = storage_root / asset.storage_key
        self.repo.delete_media_asset(asset)
        self.db.commit()
        if file_path.exists():
            file_path.unlink(missing_ok=True)
        return True

    def list_library_items(
        self,
        owner_user_id: UUID,
        scope_key: str,
        search_query: str,
        limit: int,
        app_package_name: str | None = None,
        store_type: str | None = None,
        min_supported_version: str | None = None,
        max_supported_version: str | None = None,
        released_at: str | None = None,
    ) -> list[SimulationLibrarySummary]:
        normalized_scope = normalize_scope_key(scope_key)
        normalized_limit = max(1, min(limit, 100))

        normalized_package_filter = (
            _normalize_package_name(app_package_name)
            if app_package_name and app_package_name.strip()
            else None
        )
        normalized_store_filter = (
            _normalize_store_type(store_type) if store_type and store_type.strip() else None
        )
        normalized_min_filter = (
            min_supported_version.strip()[:40]
            if min_supported_version and min_supported_version.strip()
            else None
        )
        normalized_max_filter = (
            max_supported_version.strip()[:40]
            if max_supported_version and max_supported_version.strip()
            else None
        )
        normalized_released_filter = (
            _normalize_release_date(released_at) if released_at is not None else None
        )
        if normalized_min_filter is not None:
            _parse_semver(normalized_min_filter)
        if normalized_max_filter is not None:
            _parse_semver(normalized_max_filter)

        candidate_limit = max(normalized_limit, min(500, normalized_limit * 5))
        items = self.repo.list_library_items(
            owner_user_id=owner_user_id,
            scope_key=normalized_scope,
            search_query=search_query,
            limit=candidate_limit,
        )

        summaries: list[SimulationLibrarySummary] = []
        for item in items:
            summary = self._build_library_summary(item)
            binding = summary.binding

            if normalized_package_filter and (
                binding is None or binding.app_package_name != normalized_package_filter
            ):
                continue
            if normalized_store_filter and (
                binding is None or binding.store_type != normalized_store_filter
            ):
                continue
            if normalized_min_filter and (
                binding is None or binding.min_supported_version != normalized_min_filter
            ):
                continue
            if normalized_max_filter and (
                binding is None or binding.max_supported_version != normalized_max_filter
            ):
                continue
            if normalized_released_filter and (
                binding is None or binding.released_at != normalized_released_filter
            ):
                continue

            summaries.append(summary)
            if len(summaries) >= normalized_limit:
                break

        return summaries

    def _build_library_summary(self, item: SimulationLibraryItem) -> SimulationLibrarySummary:
        payload_json = item.payload_json if isinstance(item.payload_json, dict) else {}
        raw_screens = payload_json.get("screens")
        screens_count = len(raw_screens) if isinstance(raw_screens, list) else 0
        links_count = _count_library_links(payload_json)
        binding = _extract_library_binding(payload_json)
        return SimulationLibrarySummary(
            id=item.id,
            owner_user_id=item.owner_user_id,
            scope_key=item.scope_key,
            title=item.title,
            target_app_name=item.target_app_name,
            binding=binding,
            screens_count=screens_count,
            links_count=links_count,
            created_at=item.created_at,
            updated_at=item.updated_at,
            payload_json=payload_json,
        )

    def _build_library_item_payload(self, item: SimulationLibraryItem) -> dict[str, Any]:
        summary = self._build_library_summary(item)
        return {
            "id": summary.id,
            "owner_user_id": summary.owner_user_id,
            "scope_key": summary.scope_key,
            "title": summary.title,
            "target_app_name": summary.target_app_name,
            "binding": summary.binding,
            "screens_count": summary.screens_count,
            "links_count": summary.links_count,
            "created_at": summary.created_at,
            "updated_at": summary.updated_at,
            "payload_json": summary.payload_json,
        }

    def create_library_item(
        self,
        owner_user_id: UUID,
        scope_key: str,
        title: str | None,
        payload_json: dict,
    ) -> dict[str, Any]:
        if not isinstance(payload_json, dict):
            raise ValueError("payload_json must be a JSON object.")

        normalized_scope = normalize_scope_key(scope_key)
        normalized_title, target_app_name = _extract_library_metadata(
            title=title,
            payload_json=payload_json,
        )

        item = self.repo.create_library_item(
            owner_user_id=owner_user_id,
            scope_key=normalized_scope,
            title=normalized_title,
            target_app_name=target_app_name,
            payload_json=payload_json,
        )
        self.db.commit()
        return self._build_library_item_payload(item)

    def update_library_item(
        self,
        owner_user_id: UUID,
        item_id: UUID,
        title: str | None,
        payload_json: dict,
    ) -> dict[str, Any] | None:
        if not isinstance(payload_json, dict):
            raise ValueError("payload_json must be a JSON object.")

        item = self.repo.get_library_item_by_id(
            owner_user_id=owner_user_id,
            item_id=item_id,
        )
        if item is None:
            return None

        normalized_title, target_app_name = _extract_library_metadata(
            title=title,
            payload_json=payload_json,
        )
        updated = self.repo.update_library_item(
            item=item,
            title=normalized_title,
            target_app_name=target_app_name,
            payload_json=payload_json,
        )
        self.db.commit()
        return self._build_library_item_payload(updated)

    def get_library_item(
        self,
        owner_user_id: UUID,
        item_id: UUID,
    ) -> dict[str, Any] | None:
        item = self.repo.get_library_item_by_id(
            owner_user_id=owner_user_id,
            item_id=item_id,
        )
        if item is None:
            return None
        return self._build_library_item_payload(item)

    def delete_library_item(
        self,
        owner_user_id: UUID,
        item_id: UUID,
    ) -> bool:
        item = self.repo.get_library_item_by_id(
            owner_user_id=owner_user_id,
            item_id=item_id,
        )
        if item is None:
            return False
        self.repo.delete_library_item(item)
        self.db.commit()
        return True
