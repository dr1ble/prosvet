from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.modules.search.api.schemas import SearchResponse
from app.modules.search.domain.registry import SearchContext
from app.modules.search.domain.service import SearchService
from app.modules.search.infra.adapters.course_adapter import CourseSearchAdapter
from app.modules.search.infra.adapters.group_adapter import GroupSearchAdapter
from app.modules.search.infra.adapters.user_adapter import UserSearchAdapter
from app.modules.users.models import User
from app.shared.auth.deps import get_current_user
from app.shared.db.deps import get_db

router = APIRouter(prefix="/search", tags=["search"])

_service = SearchService()
_service.register(CourseSearchAdapter())
_service.register(UserSearchAdapter())
_service.register(GroupSearchAdapter())


@router.get("", response_model=SearchResponse)
def global_search(
    q: str = Query(min_length=1, max_length=200),
    types: str | None = Query(default=None, description="Comma-separated entity types"),
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SearchResponse:
    type_list = [t.strip() for t in types.split(",")] if types else None
    ctx = SearchContext(db=db, user_id=str(user.id), user_role=user.role.value)
    return _service.search(ctx, query=q, types=type_list, limit=limit)
