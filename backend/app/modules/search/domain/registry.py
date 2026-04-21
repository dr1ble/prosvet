from abc import ABC, abstractmethod
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.search.api.schemas import SearchResult


@dataclass
class SearchContext:
    """Carries per-request state to adapters."""

    db: Session
    user_id: str
    user_role: str


class SearchAdapter(ABC):
    """Protocol for entity-specific search implementations."""

    @property
    @abstractmethod
    def entity_type(self) -> str: ...

    @abstractmethod
    def search(self, ctx: SearchContext, query: str, limit: int) -> list[SearchResult]: ...
