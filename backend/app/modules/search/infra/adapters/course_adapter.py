from sqlalchemy import func, or_, select

from app.modules.catalog.infra.models import Course
from app.modules.search.api.schemas import SearchResult
from app.modules.search.domain.registry import SearchAdapter, SearchContext


class CourseSearchAdapter(SearchAdapter):
    @property
    def entity_type(self) -> str:
        return "course"

    def search(self, ctx: SearchContext, query: str, limit: int) -> list[SearchResult]:
        pattern = f"%{query.strip().lower()}%"

        stmt = (
            select(Course)
            .where(
                or_(
                    func.lower(Course.title).like(pattern),
                    func.lower(Course.slug).like(pattern),
                )
            )
            .order_by(Course.title)
            .limit(limit)
        )

        rows = ctx.db.scalars(stmt).all()

        results: list[SearchResult] = []
        for course in rows:
            score = self._score(course, query)
            results.append(
                SearchResult(
                    type="course",
                    id=str(course.id),
                    title=course.title,
                    subtitle=course.description[:100] if course.description else None,
                    href=f"/catalog/courses/{course.slug}",
                    relevance_score=score,
                )
            )
        return results

    def _score(self, course: Course, query: str) -> float:
        q = query.lower()
        if course.title.lower() == q:
            return 1.0
        if course.title.lower().startswith(q):
            return 0.9
        if course.slug.lower() == q:
            return 0.85
        if course.slug.lower().startswith(q):
            return 0.7
        if q in course.title.lower():
            return 0.6
        return 0.3
