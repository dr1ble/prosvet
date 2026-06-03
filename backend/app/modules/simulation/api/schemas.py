from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class _BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SimulationDraftUpsertIn(_BaseSchema):
    title: str = Field(min_length=1, max_length=255)
    payload_json: dict[str, Any]


class SimulationDraftOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_user_id: UUID
    scope_key: str
    title: str
    payload_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class SimulationMediaAssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_user_id: UUID
    scope_key: str
    app_package_name: str
    store_type: str
    min_supported_version: str
    max_supported_version: str
    released_at: date | None
    original_filename: str
    content_type: str
    size_bytes: int
    created_at: datetime


class SimulationMediaListOut(_BaseSchema):
    items: list[SimulationMediaAssetOut]


class SimulationMediaUploadOut(_BaseSchema):
    asset: SimulationMediaAssetOut


class SimulationMediaAssetUpdateIn(_BaseSchema):
    original_filename: str = Field(min_length=1, max_length=255)


class SimulationMediaApplicationUpsertIn(_BaseSchema):
    app_package_name: str = Field(min_length=3, max_length=255)
    app_name: str = Field(min_length=1, max_length=255)
    icon_url: str | None = Field(default=None, max_length=1000)
    store_url: str | None = Field(default=None, max_length=500)


class SimulationMediaApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_user_id: UUID
    scope_key: str
    app_package_name: str
    app_name: str
    icon_url: str | None
    store_url: str | None
    created_at: datetime
    updated_at: datetime


class SimulationMediaAppBindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    app_package_name: str
    app_name: str | None
    icon_url: str | None
    store_url: str | None
    store_type: str
    min_supported_version: str
    max_supported_version: str
    released_at: date | None
    assets_count: int
    latest_asset_at: datetime


class SimulationMediaAppBindingListOut(_BaseSchema):
    items: list[SimulationMediaAppBindingOut]


class SimulationLibraryCreateIn(_BaseSchema):
    title: str | None = Field(default=None, max_length=255)
    payload_json: dict[str, Any]


class SimulationLibraryBindingOut(_BaseSchema):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    app_package_name: str
    store_type: str
    min_supported_version: str
    max_supported_version: str
    released_at: date | None
    icon_url: str | None


class SimulationLibraryItemSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    owner_user_id: UUID
    scope_key: str
    title: str
    target_app_name: str | None
    binding: SimulationLibraryBindingOut | None
    screens_count: int
    links_count: int
    created_at: datetime
    updated_at: datetime


class SimulationLibraryItemOut(SimulationLibraryItemSummaryOut):
    payload_json: dict[str, Any]


class SimulationLibraryListOut(_BaseSchema):
    items: list[SimulationLibraryItemSummaryOut]
