from collections.abc import Callable
from typing import Any


class EventBus:
    """In-process event bus used for module decoupling."""

    def __init__(self) -> None:
        self._handlers: dict[str, list[Callable[[Any], None]]] = {}

    def subscribe(self, event_name: str, handler: Callable[[Any], None]) -> None:
        self._handlers.setdefault(event_name, []).append(handler)

    def publish(self, event_name: str, payload: Any) -> None:
        for handler in self._handlers.get(event_name, []):
            handler(payload)
