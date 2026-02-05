from app.modules.auth.domain.services import _parse_admin_phones


def test_parse_admin_phones_filters_empty_and_normalizes() -> None:
    parsed = _parse_admin_phones(" +7 (900) 123-45-67, ,+1-202-555-0199 ,text")

    assert parsed == {"79001234567", "12025550199"}
