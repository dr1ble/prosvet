from sqlalchemy import func, or_, select

from app.modules.search.api.schemas import SearchResult
from app.modules.search.domain.registry import SearchAdapter, SearchContext
from app.modules.users.models import User, UserStatus


class UserSearchAdapter(SearchAdapter):
    @property
    def entity_type(self) -> str:
        return "user"

    def search(self, ctx: SearchContext, query: str, limit: int) -> list[SearchResult]:
        pattern = f"%{query.strip().lower()}%"

        conditions = [
            func.lower(User.login).like(pattern),
        ]
        if User.display_name is not None:
            conditions.append(func.lower(User.display_name).like(pattern))

        stmt = (
            select(User)
            .where(
                User.status == UserStatus.ACTIVE,
                or_(*conditions),
            )
            .order_by(User.login)
            .limit(limit)
        )

        rows = ctx.db.scalars(stmt).all()

        results: list[SearchResult] = []
        for user in rows:
            score = self._score(user, query)
            results.append(
                SearchResult(
                    type="user",
                    id=str(user.id),
                    title=user.display_name or user.login or str(user.id),
                    subtitle=user.role.value if hasattr(user.role, "value") else str(user.role),
                    href=f"/users/{user.id}",
                    relevance_score=score,
                )
            )
        return results

    def _score(self, user: User, query: str) -> float:
        q = query.lower()
        login = (user.login or "").lower()
        display = (user.display_name or "").lower()

        if login == q:
            return 1.0
        if display == q:
            return 0.95
        if login.startswith(q):
            return 0.8
        if display.startswith(q):
            return 0.75
        if q in login:
            return 0.6
        if q in display:
            return 0.55
        return 0.3
