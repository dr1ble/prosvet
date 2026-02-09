from datetime import datetime, timezone
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.simulation.api.schemas import SimulationDraftOut, SimulationDraftUpsertIn


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
