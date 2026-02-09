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
