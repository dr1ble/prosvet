"""Tests for catalog screen payload schemas and discriminator."""

import pytest
from pydantic import TypeAdapter, ValidationError

from app.modules.catalog.api.payloads import (
    ArticlePayload,
    CheatSheetPayload,
    QuizPayload,
    ScreenPayload,
    SimulationPayload,
    UnknownPayload,
    VideoPayload,
)

screen_payload_adapter = TypeAdapter(ScreenPayload)


def test_video_payload_parse():
    payload = screen_payload_adapter.validate_python(
        {
            "type": "video",
            "video_url": "https://example.com/video.mp4",
            "duration_sec": 120,
            "transcript": "text",
        }
    )
    assert isinstance(payload, VideoPayload)
    assert payload.duration_sec == 120


def test_article_payload_parse():
    payload = screen_payload_adapter.validate_python(
        {"type": "article", "markdown_content": "# Intro", "assets": ["a.png"]}
    )
    assert isinstance(payload, ArticlePayload)
    assert payload.assets == ["a.png"]


def test_simulation_payload_parse():
    payload = screen_payload_adapter.validate_python(
        {
            "type": "simulation",
            "image_url": "https://example.com/img.png",
            "hotspots": [
                {
                    "x": 1,
                    "y": 2,
                    "width": 3,
                    "height": 4,
                    "label": "L",
                    "hint": "H",
                }
            ],
            "is_start": True,
        }
    )
    assert isinstance(payload, SimulationPayload)
    assert payload.is_start is True
    assert len(payload.hotspots) == 1


def test_quiz_payload_parse():
    payload = screen_payload_adapter.validate_python(
        {
            "type": "quiz",
            "questions": [
                {
                    "id": "q1",
                    "type": "single_choice",
                    "text": "Question",
                    "options": [{"id": "o1", "text": "Option"}],
                    "correct_option_id": "o1",
                }
            ],
        }
    )
    assert isinstance(payload, QuizPayload)
    assert payload.questions[0].correct_option_id == "o1"


def test_cheat_sheet_payload_parse():
    payload = screen_payload_adapter.validate_python(
        {"type": "cheat_sheet", "reference_id": "ref-1"}
    )
    assert isinstance(payload, CheatSheetPayload)
    assert payload.reference_id == "ref-1"


def test_unknown_payload_parse():
    payload = screen_payload_adapter.validate_python({"type": "unknown", "raw": "blob"})
    assert isinstance(payload, UnknownPayload)
    assert payload.raw == "blob"


def test_invalid_discriminator_raises_validation_error():
    with pytest.raises(ValidationError):
        screen_payload_adapter.validate_python({"type": "unsupported"})
