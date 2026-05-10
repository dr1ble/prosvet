from dataclasses import dataclass
from enum import StrEnum


class CompetencyScoreStatus(StrEnum):
    STRONG = "strong"
    NEEDS_PRACTICE = "needs_practice"
    DEFICIT = "deficit"


@dataclass(frozen=True)
class CompetencyAnswer:
    competency_key: str
    competency_title: str
    earned_score: float
    max_score: float


@dataclass(frozen=True)
class CalculatedCompetencyScore:
    competency_key: str
    competency_title: str
    score: float
    threshold: float
    status: CompetencyScoreStatus


@dataclass(frozen=True)
class CompetencyRecommendationCandidate:
    course_id: str
    course_title: str
    competency_key: str
    reason: str
    course_type: str = "foundation"


@dataclass(frozen=True)
class RankedTrajectoryItem:
    course_id: str
    course_title: str
    competency_key: str
    reason: str
    priority: int


COURSE_TYPE_RANK_BY_STATUS = {
    CompetencyScoreStatus.DEFICIT: {
        "foundation": 0,
        "practice": 1,
        "additional": 2,
    },
    CompetencyScoreStatus.NEEDS_PRACTICE: {
        "practice": 0,
        "foundation": 1,
        "additional": 2,
    },
}


def calculate_competency_scores(
    answers: list[CompetencyAnswer],
    *,
    success_threshold: float = 0.8,
    practice_threshold: float = 0.5,
) -> list[CalculatedCompetencyScore]:
    grouped: dict[str, tuple[str, float, float]] = {}
    for answer in answers:
        title, earned, possible = grouped.get(answer.competency_key, (answer.competency_title, 0.0, 0.0))
        grouped[answer.competency_key] = (
            title,
            earned + answer.earned_score,
            possible + answer.max_score,
        )

    scores: list[CalculatedCompetencyScore] = []
    for competency_key, (title, earned, possible) in grouped.items():
        score = round(earned / possible, 4) if possible > 0 else 0.0
        if score >= success_threshold:
            status = CompetencyScoreStatus.STRONG
        elif score >= practice_threshold:
            status = CompetencyScoreStatus.NEEDS_PRACTICE
        else:
            status = CompetencyScoreStatus.DEFICIT
        scores.append(
            CalculatedCompetencyScore(
                competency_key=competency_key,
                competency_title=title,
                score=score,
                threshold=success_threshold,
                status=status,
            )
        )
    return scores


def rank_trajectory_candidates(
    *,
    competency_scores: list[CalculatedCompetencyScore],
    candidates: list[CompetencyRecommendationCandidate],
) -> list[RankedTrajectoryItem]:
    status_by_key = {score.competency_key: score.status for score in competency_scores}
    status_rank = {
        CompetencyScoreStatus.DEFICIT: 0,
        CompetencyScoreStatus.NEEDS_PRACTICE: 1,
        CompetencyScoreStatus.STRONG: 2,
    }

    ranked_candidates = sorted(
        candidates,
        key=lambda candidate: (
            status_rank.get(status_by_key.get(candidate.competency_key), 3),
            COURSE_TYPE_RANK_BY_STATUS.get(
                status_by_key.get(candidate.competency_key),
                {},
            ).get(candidate.course_type, 9),
            candidate.course_title.lower(),
        ),
    )
    return [
        RankedTrajectoryItem(
            course_id=candidate.course_id,
            course_title=candidate.course_title,
            competency_key=candidate.competency_key,
            reason=candidate.reason,
            priority=index + 1,
        )
        for index, candidate in enumerate(ranked_candidates)
    ]
