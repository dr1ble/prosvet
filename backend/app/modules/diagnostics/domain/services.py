from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.catalog.infra.models import Course
from app.modules.catalog.infra.repository import CatalogRepository
from app.modules.diagnostics.domain.errors import DiagnosticsError
from app.modules.diagnostics.domain.rules import (
    CompetencyAnswer,
    CompetencyRecommendationCandidate,
    CompetencyScoreStatus,
    calculate_competency_scores,
    rank_trajectory_candidates,
)
from app.modules.diagnostics.infra.models import (
    DiagnosticAnswer,
    DiagnosticAttempt,
    DiagnosticAttemptStatus,
    DiagnosticCompetencyScore,
    DiagnosticQuestion,
    DiagnosticQuestionBank,
    LearningTrajectoryItem,
    LearningTrajectoryStatus,
)
from app.modules.diagnostics.infra.repository import DiagnosticsRepository

DEFAULT_BANK_CODE = "digital-skills-v1"

DEFAULT_QUESTIONS = [
    {
        "competency_key": "gosuslugi",
        "competency_title": "Госуслуги",
        "prompt": "Где безопаснее проверять статус заявления на получение услуги?",
        "options": [
            {"key": "a", "text": "В случайном сообщении из мессенджера"},
            {"key": "b", "text": "В официальном приложении или на портале"},
            {"key": "c", "text": "По ссылке из рекламного баннера"},
        ],
        "correct_option_key": "b",
        "weight": 1,
    },
    {
        "competency_key": "banking",
        "competency_title": "Онлайн-банкинг",
        "prompt": "Что нельзя сообщать человеку, который представился сотрудником банка?",
        "options": [
            {"key": "a", "text": "Код из SMS или push-уведомления"},
            {"key": "b", "text": "Название банка"},
            {"key": "c", "text": "Город проживания"},
        ],
        "correct_option_key": "a",
        "weight": 1,
    },
    {
        "competency_key": "messengers",
        "competency_title": "Мессенджеры",
        "prompt": "Как лучше поступить с подозрительным файлом от неизвестного контакта?",
        "options": [
            {"key": "a", "text": "Открыть и проверить"},
            {"key": "b", "text": "Переслать друзьям"},
            {"key": "c", "text": "Не открывать и удалить"},
        ],
        "correct_option_key": "c",
        "weight": 1,
    },
    {
        "competency_key": "security",
        "competency_title": "Кибербезопасность",
        "prompt": "Какой пароль надежнее?",
        "options": [
            {"key": "a", "text": "123456"},
            {"key": "b", "text": "Дата рождения"},
            {"key": "c", "text": "Длинная уникальная фраза"},
        ],
        "correct_option_key": "c",
        "weight": 1,
    },
]

COMPETENCY_KEYWORDS = {
    "gosuslugi": ("госуслуг", "заявлен", "портал"),
    "banking": ("банк", "плат", "деньг", "карт", "перевод"),
    "messengers": ("whatsapp", "telegram", "мессендж", "чат", "сообщ"),
    "security": ("мошен", "безопас", "защит", "пароль", "фишинг"),
}

DEMO_COURSES = {
    "gosuslugi": {
        "slug": "demo-gosuslugi-basics",
        "title": "Основы работы с Госуслугами",
        "description": "Базовый курс по работе с порталом и приложением Госуслуги.",
    },
    "banking": {
        "slug": "demo-safe-online-banking",
        "title": "Безопасный онлайн-банкинг",
        "description": "Базовый курс по безопасным платежам и переводам онлайн.",
    },
    "messengers": {
        "slug": "demo-messengers",
        "title": "Общение в мессенджерах",
        "description": "Базовый курс по чатам, сообщениям и безопасному обмену файлами.",
    },
    "security": {
        "slug": "demo-digital-security",
        "title": "Цифровая безопасность и пароли",
        "description": "Базовый курс по паролям, мошенничеству и защите данных.",
    },
}


@dataclass(frozen=True)
class DiagnosticBankDetails:
    bank: DiagnosticQuestionBank
    questions: list[DiagnosticQuestion]


@dataclass(frozen=True)
class DiagnosticResultDetails:
    attempt: DiagnosticAttempt
    scores: list[DiagnosticCompetencyScore]


@dataclass(frozen=True)
class TrajectoryDetails:
    item: LearningTrajectoryItem
    course: Course | None


class DiagnosticsService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = DiagnosticsRepository(db)
        self.catalog_repo = CatalogRepository(db)

    def get_active_bank(self) -> tuple[DiagnosticQuestionBank, list[DiagnosticQuestion]]:
        bank = self._ensure_default_bank()
        return bank, self.repo.list_questions(bank.id)

    def start_attempt(self, user_id: UUID) -> DiagnosticAttempt:
        bank = self._ensure_default_bank()
        return self.repo.create_attempt(user_id=user_id, bank_id=bank.id)

    def submit_answer(
        self,
        *,
        user_id: UUID,
        attempt_id: UUID,
        question_id: UUID,
        selected_option_key: str,
    ) -> DiagnosticAnswer:
        attempt = self._get_owned_attempt(user_id=user_id, attempt_id=attempt_id)
        if attempt.status != DiagnosticAttemptStatus.IN_PROGRESS.value:
            raise DiagnosticsError("Diagnostic attempt is already completed.", status_code=409)
        question = self.repo.get_question(question_id)
        if question is None or question.bank_id != attempt.bank_id:
            raise DiagnosticsError("Diagnostic question not found.", status_code=404)
        option_keys = {str(option.get("key")) for option in question.options_json}
        if selected_option_key not in option_keys:
            raise DiagnosticsError("Diagnostic answer option not found.", status_code=422)

        is_correct = selected_option_key == question.correct_option_key
        return self.repo.upsert_answer(
            attempt.id,
            question.id,
            selected_option_key,
            is_correct=is_correct,
            score=float(question.weight if is_correct else 0),
        )

    def complete_attempt(self, *, user_id: UUID, attempt_id: UUID) -> DiagnosticResultDetails:
        attempt = self._get_owned_attempt(user_id=user_id, attempt_id=attempt_id)
        if attempt.status != DiagnosticAttemptStatus.IN_PROGRESS.value:
            raise DiagnosticsError("Diagnostic attempt is already completed.", status_code=409)

        questions = self.repo.list_questions(attempt.bank_id)
        answers = self.repo.list_answers(attempt.id)
        answers_by_question_id = {answer.question_id: answer for answer in answers}
        if {question.id for question in questions} != set(answers_by_question_id):
            raise DiagnosticsError("Diagnostic attempt has unanswered questions.", status_code=422)

        calculated_scores = calculate_competency_scores(
            [
                CompetencyAnswer(
                    competency_key=question.competency_key,
                    competency_title=question.competency_title,
                    earned_score=answers_by_question_id[question.id].score,
                    max_score=float(question.weight),
                )
                for question in questions
            ]
        )
        overall_score = (
            sum(score.score for score in calculated_scores) / len(calculated_scores)
            if calculated_scores
            else 0.0
        )
        completed = self.repo.complete_attempt(attempt, overall_score=round(overall_score, 4))
        rows = self.repo.replace_competency_scores(
            attempt_id=attempt.id,
            scores=[
                {
                    "competency_key": score.competency_key,
                    "competency_title": score.competency_title,
                    "score": score.score,
                    "threshold": score.threshold,
                    "status": score.status.value,
                }
                for score in calculated_scores
            ],
        )
        self._regenerate_trajectory(user_id=user_id, attempt_id=attempt.id, scores=calculated_scores)
        return DiagnosticResultDetails(attempt=completed, scores=rows)

    def get_latest_result(self, user_id: UUID) -> DiagnosticResultDetails | None:
        attempt = self.repo.get_latest_completed_attempt(user_id)
        if attempt is None:
            return None
        return DiagnosticResultDetails(
            attempt=attempt,
            scores=self.repo.list_competency_scores(attempt.id),
        )

    def get_my_trajectory(self, user_id: UUID) -> list[TrajectoryDetails]:
        items = self.repo.list_trajectory_items(user_id)
        return [
            TrajectoryDetails(
                item=item,
                course=self.catalog_repo.get_course_by_id(item.course_id) if item.course_id else None,
            )
            for item in items
        ]

    def apply_course_completion(self, *, user_id: UUID, course_id: UUID) -> None:
        item = self.repo.get_trajectory_item_for_course(user_id=user_id, course_id=course_id)
        if item is None:
            return
        score = self.repo.get_competency_score(
            attempt_id=item.attempt_id,
            competency_key=item.competency_key,
        )
        if score is not None and score.status == CompetencyScoreStatus.DEFICIT.value:
            self.repo.update_competency_score(
                score,
                value=max(score.score, 0.5),
                status=CompetencyScoreStatus.NEEDS_PRACTICE.value,
            )
        self.repo.update_trajectory_item_status(
            item,
            status=LearningTrajectoryStatus.COMPLETED.value,
        )

    def _get_owned_attempt(self, *, user_id: UUID, attempt_id: UUID) -> DiagnosticAttempt:
        attempt = self.repo.get_attempt(attempt_id)
        if attempt is None:
            raise DiagnosticsError("Diagnostic attempt not found.", status_code=404)
        if attempt.user_id != user_id:
            raise DiagnosticsError("Diagnostic attempt not found.", status_code=404)
        return attempt

    def _ensure_default_bank(self) -> DiagnosticQuestionBank:
        bank = self.repo.get_question_bank_by_code(DEFAULT_BANK_CODE)
        if bank is None:
            bank = self.repo.create_question_bank(
                code=DEFAULT_BANK_CODE,
                title="Входная диагностика цифровых навыков",
                version=1,
            )
            for index, question in enumerate(DEFAULT_QUESTIONS, start=1):
                self.repo.create_question(
                    bank_id=bank.id,
                    competency_key=question["competency_key"],
                    competency_title=question["competency_title"],
                    prompt=question["prompt"],
                    options=question["options"],
                    correct_option_key=question["correct_option_key"],
                    weight=question["weight"],
                    order_index=index,
                )
        return bank

    def _regenerate_trajectory(
        self,
        *,
        user_id: UUID,
        attempt_id: UUID,
        scores,
    ) -> None:
        self._ensure_demo_courses()
        target_scores = [score for score in scores if score.status != CompetencyScoreStatus.STRONG]
        courses = self.catalog_repo.list_courses(include_drafts=False, include_archived=False)
        links = self.catalog_repo.list_course_competencies_for_courses([course.id for course in courses])
        links_by_competency: dict[str, list] = {}
        course_by_id = {course.id: course for course in courses}
        for link in links:
            links_by_competency.setdefault(link.competency_key, []).append(link)

        candidates: list[CompetencyRecommendationCandidate] = []
        for score in target_scores:
            explicit_links = links_by_competency.get(score.competency_key, [])
            if explicit_links:
                for link in explicit_links:
                    course = course_by_id.get(link.course_id)
                    if course is None:
                        continue
                    candidates.append(
                        CompetencyRecommendationCandidate(
                            course_id=str(course.id),
                            course_title=course.title,
                            competency_key=score.competency_key,
                            reason=self._trajectory_reason(score.status),
                            course_type=link.course_type,
                        )
                    )
                continue

            keywords = COMPETENCY_KEYWORDS.get(score.competency_key, ())
            for course in courses:
                haystack = f"{course.title} {course.description or ''}".lower()
                if any(keyword in haystack for keyword in keywords):
                    candidates.append(
                        CompetencyRecommendationCandidate(
                            course_id=str(course.id),
                            course_title=course.title,
                            competency_key=score.competency_key,
                            reason=self._trajectory_reason(score.status),
                            course_type="foundation",
                        )
                    )

        ranked = rank_trajectory_candidates(competency_scores=target_scores, candidates=candidates)
        self.repo.replace_trajectory_items(
            user_id=user_id,
            attempt_id=attempt_id,
            items=[
                {
                    "course_id": UUID(item.course_id),
                    "competency_key": item.competency_key,
                    "reason": item.reason,
                    "priority": item.priority,
                }
                for item in ranked
            ],
        )

    def _trajectory_reason(self, status: CompetencyScoreStatus) -> str:
        if status == CompetencyScoreStatus.DEFICIT:
            return "Рекомендуется для закрытия выявленного дефицита"
        return "Рекомендуется для закрепления навыка"

    def _ensure_demo_courses(self) -> None:
        for competency_key, config in DEMO_COURSES.items():
            course = self.catalog_repo.get_course_by_slug(config["slug"])
            if course is None:
                course = self.catalog_repo.create_course(
                    slug=config["slug"],
                    title=config["title"],
                    description=config["description"],
                    status="active",
                    author_id=None,
                )
            if self.catalog_repo.get_competency(competency_key) is None:
                self.catalog_repo.create_competency(
                    key=competency_key,
                    title=next(
                        question["competency_title"]
                        for question in DEFAULT_QUESTIONS
                        if question["competency_key"] == competency_key
                    ),
                    description=None,
                    category=None,
                )
            links = self.catalog_repo.list_course_competencies(course.id)
            if not links:
                self.catalog_repo.replace_course_competencies(
                    course_id=course.id,
                    items=[
                        {
                            "competency_key": competency_key,
                            "course_type": "foundation",
                        }
                    ],
                )
