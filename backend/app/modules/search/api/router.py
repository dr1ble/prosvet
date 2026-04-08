from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.modules.search.api.schemas import SearchResponse
from app.modules.search.domain.registry import SearchContext
from app.modules.search.domain.service import SearchService
from app.modules.search.infra.adapters.course_adapter import CourseSearchAdapter
from app.modules.search.infra.adapters.group_adapter import GroupSearchAdapter
from app.modules.search.infra.adapters.user_adapter import UserSearchAdapter
from app.shared.auth.deps import require_policy
from app.shared.db.deps import get_db

router = APIRouter(prefix="/search", tags=["search"])

_service = SearchService()
_service.register(CourseSearchAdapter())
_service.register(UserSearchAdapter())
_service.register(GroupSearchAdapter())


@router.get("", response_model=SearchResponse)
def global_search(
    q: str = Query(min_length=1, max_length=200),
    types: list[str] | None = Query(default=None, description="Entity types, repeated or comma-separated"),
    limit: int = Query(default=20, ge=1, le=100),
    actor=Depends(require_policy("search.view")),
    db: Session = Depends(get_db),
) -> SearchResponse:
    type_list: list[str] | None = None
    if types:
        normalized = {
            chunk.strip()
            for item in types
            for chunk in item.split(",")
            if chunk.strip()
        }
        type_list = sorted(normalized) if normalized else None

    ctx = SearchContext(db=db, user_id=str(actor.user_id), user_role=actor.role.value)
    return _service.search(ctx, query=q, types=type_list, limit=limit)
