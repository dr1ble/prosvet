from datetime import datetime, timezone
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.simulation.api.schemas import (
    SimulationDraftOut,
    SimulationDraftUpsertIn,
    SimulationLibraryCreateIn,
    SimulationLibraryItemSummaryOut,
)


def test_simulation_draft_upsert_accepts_valid_payload() -> None:
    payload = SimulationDraftUpsertIn(
        title="Платеж в банковском приложении",
        payload_json={"version": 1, "screens": []},
    )

    assert payload.title == "Платеж в банковском приложении"
    assert payload.payload_json["version"] == 1


def test_simulation_draft_upsert_rejects_blank_title() -> None:
    with pytest.raises(ValidationError):
        SimulationDraftUpsertIn(
            title="",
            payload_json={"version": 1},
        )


def test_simulation_draft_out_contains_scope_key() -> None:
    data = SimulationDraftOut.model_validate(
        {
            "id": uuid4(),
            "owner_user_id": uuid4(),
            "scope_key": "course:1|lesson:2",
            "title": "Draft",
            "payload_json": {"version": 1, "screens": []},
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
    )

    assert data.scope_key == "course:1|lesson:2"


def test_simulation_library_create_accepts_payload() -> None:
    payload = SimulationLibraryCreateIn(
        title="Банковский перевод",
        payload_json={"version": 1, "screens": []},
    )

    assert payload.title == "Банковский перевод"
    assert payload.payload_json["version"] == 1


def test_simulation_library_summary_allows_nullable_target_app() -> None:
    data = SimulationLibraryItemSummaryOut.model_validate(
        {
            "id": uuid4(),
            "owner_user_id": uuid4(),
            "scope_key": "global",
            "title": "Template",
            "target_app_name": None,
            "binding": None,
            "screens_count": 0,
            "links_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        },
    )

    assert data.target_app_name is None
