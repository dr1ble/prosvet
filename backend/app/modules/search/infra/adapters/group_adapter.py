from sqlalchemy import func, or_, select

from app.modules.groups.infra.models import GroupStatus, LearningGroup
from app.modules.search.api.schemas import SearchResult
from app.modules.search.domain.registry import SearchAdapter, SearchContext


class GroupSearchAdapter(SearchAdapter):
    @property
    def entity_type(self) -> str:
        return "group"

    def search(self, ctx: SearchContext, query: str, limit: int) -> list[SearchResult]:
        pattern = f"%{query.strip().lower()}%"

        conditions = [func.lower(LearningGroup.name).like(pattern)]
        if LearningGroup.description is not None:
            conditions.append(func.lower(LearningGroup.description).like(pattern))

        stmt = (
            select(LearningGroup)
            .where(
                LearningGroup.status == GroupStatus.ACTIVE,
                or_(*conditions),
            )
            .order_by(LearningGroup.name)
            .limit(limit)
        )

        rows = ctx.db.scalars(stmt).all()

        results: list[SearchResult] = []
        for group in rows:
            score = self._score(group, query)
            results.append(
                SearchResult(
                    type="group",
                    id=str(group.id),
                    title=group.name,
                    subtitle=group.description[:100] if group.description else None,
                    href=f"/groups/{group.id}",
                    relevance_score=score,
                )
            )
        return results

    def _score(self, group: LearningGroup, query: str) -> float:
        q = query.lower()
        name = (group.name or "").lower()
        desc = (group.description or "").lower()

        if name == q:
            return 1.0
        if name.startswith(q):
            return 0.8
        if q in name:
            return 0.6
        if q in desc:
            return 0.4
        return 0.3
