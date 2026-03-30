import sys

from catalog_mock_data import cleanup_mock_catalog_courses


def cleanup_mixed_lesson(dry_run: bool = False) -> None:
    cleanup_mock_catalog_courses(dry_run=dry_run)


if __name__ == "__main__":
    cleanup_mixed_lesson(dry_run="--dry-run" in sys.argv)
