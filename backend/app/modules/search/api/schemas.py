from pydantic import BaseModel, Field


class SearchResult(BaseModel):
    type: str  # "course" | "user" | "group"
    id: str
    title: str
    subtitle: str | None = None
    href: str
    relevance_score: float = 0.0


class SearchRequest(BaseModel):
    q: str = Field(min_length=1, max_length=200)
    types: list[str] | None = Field(default=None, min_length=1)
    limit: int = Field(default=20, ge=1, le=100)


class SearchResponse(BaseModel):
    results: list[SearchResult]
    total_by_type: dict[str, int] = Field(default_factory=dict)
