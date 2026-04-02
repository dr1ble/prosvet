from app.modules.search.api.schemas import SearchResponse, SearchResult
from app.modules.search.domain.registry import SearchAdapter, SearchContext


class SearchService:
    def __init__(self) -> None:
        self._adapters: dict[str, SearchAdapter] = {}

    def register(self, adapter: SearchAdapter) -> None:
        self._adapters[adapter.entity_type] = adapter

    def search(
        self,
        ctx: SearchContext,
        query: str,
        types: list[str] | None,
        limit: int,
    ) -> SearchResponse:
        per_type = min(max(limit // max(len(types or self._adapters), 1), 1), limit)
        results: list[SearchResult] = []
        total_by_type: dict[str, int] = {}

        for entity_type, adapter in self._adapters.items():
            if types and entity_type not in types:
                continue
            entity_results = adapter.search(ctx, query, per_type)
            total_by_type[entity_type] = len(entity_results)
            results.extend(entity_results)

        results.sort(key=lambda r: -r.relevance_score)
        return SearchResponse(results=results[:limit], total_by_type=total_by_type)
