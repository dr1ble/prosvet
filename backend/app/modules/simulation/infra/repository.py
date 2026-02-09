from datetime import date
from uuid import UUID

from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.orm import Session

from app.modules.simulation.infra.models import (
    SimulationDraft,
    SimulationLibraryItem,
    SimulationMediaAsset,
)


class SimulationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_current_by_owner(
        self,
        owner_user_id: UUID,
        scope_key: str,
    ) -> SimulationDraft | None:
        stmt = select(SimulationDraft).where(
            SimulationDraft.owner_user_id == owner_user_id,
            SimulationDraft.scope_key == scope_key,
        )
        return self.db.scalar(stmt)

    def create_draft(
        self,
        owner_user_id: UUID,
        scope_key: str,
        title: str,
        payload_json: dict,
    ) -> SimulationDraft:
        draft = SimulationDraft(
            owner_user_id=owner_user_id,
            scope_key=scope_key,
            title=title,
            payload_json=payload_json,
        )
        self.db.add(draft)
        self.db.flush()
        return draft

    def update_draft(
        self,
        draft: SimulationDraft,
        title: str,
        payload_json: dict,
    ) -> SimulationDraft:
        draft.title = title
        draft.payload_json = payload_json
        self.db.flush()
        return draft

    def list_media_assets(
        self,
        owner_user_id: UUID,
        scope_key: str,
        app_package_name: str,
        store_type: str,
        min_supported_version: str,
        max_supported_version: str,
        released_at: date | None,
        search_query: str,
        limit: int,
    ) -> list[SimulationMediaAsset]:
        stmt = select(SimulationMediaAsset).where(
            SimulationMediaAsset.owner_user_id == owner_user_id,
            SimulationMediaAsset.app_package_name == app_package_name,
            SimulationMediaAsset.store_type == store_type,
            SimulationMediaAsset.min_supported_version == min_supported_version,
            SimulationMediaAsset.max_supported_version == max_supported_version,
            or_(
                SimulationMediaAsset.scope_key == "global",
                SimulationMediaAsset.scope_key == scope_key,
            ),
        )
        if released_at is not None:
            stmt = stmt.where(SimulationMediaAsset.released_at == released_at)
        normalized_query = search_query.strip().lower()
        if normalized_query:
            pattern = f"%{normalized_query}%"
            stmt = stmt.where(
                or_(
                    func.lower(SimulationMediaAsset.original_filename).like(pattern),
                    func.lower(SimulationMediaAsset.storage_key).like(pattern),
                )
            )
        stmt = stmt.order_by(desc(SimulationMediaAsset.created_at)).limit(limit)
        return list(self.db.scalars(stmt))

    def create_media_asset(
        self,
        owner_user_id: UUID,
        scope_key: str,
        app_package_name: str,
        store_type: str,
        min_supported_version: str,
        max_supported_version: str,
        released_at: date | None,
        original_filename: str,
        storage_key: str,
        content_type: str,
        size_bytes: int,
    ) -> SimulationMediaAsset:
        asset = SimulationMediaAsset(
            owner_user_id=owner_user_id,
            scope_key=scope_key,
            app_package_name=app_package_name,
            store_type=store_type,
            min_supported_version=min_supported_version,
            max_supported_version=max_supported_version,
            released_at=released_at,
            original_filename=original_filename,
            storage_key=storage_key,
            content_type=content_type,
            size_bytes=size_bytes,
        )
        self.db.add(asset)
        self.db.flush()
        return asset

    def get_media_asset_by_id(
        self,
        owner_user_id: UUID,
        asset_id: UUID,
    ) -> SimulationMediaAsset | None:
        stmt = select(SimulationMediaAsset).where(
            and_(
                SimulationMediaAsset.owner_user_id == owner_user_id,
                SimulationMediaAsset.id == asset_id,
            )
        )
        return self.db.scalar(stmt)

    def list_library_items(
        self,
        owner_user_id: UUID,
        scope_key: str,
        search_query: str,
        limit: int,
    ) -> list[SimulationLibraryItem]:
        stmt = select(SimulationLibraryItem).where(
            SimulationLibraryItem.owner_user_id == owner_user_id,
            or_(
                SimulationLibraryItem.scope_key == "global",
                SimulationLibraryItem.scope_key == scope_key,
            ),
        )
        normalized_query = search_query.strip().lower()
        if normalized_query:
            pattern = f"%{normalized_query}%"
            stmt = stmt.where(
                or_(
                    func.lower(SimulationLibraryItem.title).like(pattern),
                    func.lower(
                        func.coalesce(SimulationLibraryItem.target_app_name, "")
                    ).like(pattern),
                )
            )
        stmt = stmt.order_by(desc(SimulationLibraryItem.updated_at)).limit(limit)
        return list(self.db.scalars(stmt))

    def create_library_item(
        self,
        owner_user_id: UUID,
        scope_key: str,
        title: str,
        target_app_name: str | None,
        payload_json: dict,
    ) -> SimulationLibraryItem:
        item = SimulationLibraryItem(
            owner_user_id=owner_user_id,
            scope_key=scope_key,
            title=title,
            target_app_name=target_app_name,
            payload_json=payload_json,
        )
        self.db.add(item)
        self.db.flush()
        return item

    def get_library_item_by_id(
        self,
        owner_user_id: UUID,
        item_id: UUID,
    ) -> SimulationLibraryItem | None:
        stmt = select(SimulationLibraryItem).where(
            and_(
                SimulationLibraryItem.owner_user_id == owner_user_id,
                SimulationLibraryItem.id == item_id,
            )
        )
        return self.db.scalar(stmt)

    def update_library_item(
        self,
        item: SimulationLibraryItem,
        title: str,
        target_app_name: str | None,
        payload_json: dict,
    ) -> SimulationLibraryItem:
        item.title = title
        item.target_app_name = target_app_name
        item.payload_json = payload_json
        self.db.flush()
        return item

    def delete_library_item(self, item: SimulationLibraryItem) -> None:
        self.db.delete(item)
        self.db.flush()
