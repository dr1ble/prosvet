from enum import Enum
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class ScreenType(str, Enum):
    VIDEO = "video"
    ARTICLE = "article"
    SIMULATION = "simulation"
    QUIZ = "quiz"
    CHEAT_SHEET = "cheat_sheet"
    UNKNOWN = "unknown"


class BasePayload(BaseModel):
    pass


class VideoPayload(BasePayload):
    type: Literal[ScreenType.VIDEO] = ScreenType.VIDEO
    video_url: str
    duration_sec: int
    transcript: str | None = None


class ArticlePayload(BasePayload):
    type: Literal[ScreenType.ARTICLE] = ScreenType.ARTICLE
    markdown_content: str
    assets: list[str] = Field(default_factory=list)


class Hotspot(BaseModel):
    x: float
    y: float
    width: float
    height: float
    label: str
    hint: str
    target_screen_key: str | None = None
    action: str | None = None


class SimulationPayload(BasePayload):
    type: Literal[ScreenType.SIMULATION] = ScreenType.SIMULATION
    image_url: str
    hotspots: list[Hotspot] = Field(default_factory=list)
    is_start: bool = False
    is_completion: bool = False
    context_ref: str | None = None  # ID of a linked Article section or LessonReference


class QuizOption(BaseModel):
    id: str
    text: str


class QuizQuestionType(str, Enum):
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    MATCHING = "matching"


class QuizQuestion(BaseModel):
    id: str
    type: QuizQuestionType
    text: str
    explanation: str | None = None
    options: list[QuizOption]
    correct_option_id: str | None = None
    correct_option_ids: list[str] | None = None


class QuizPayload(BasePayload):
    type: Literal[ScreenType.QUIZ] = ScreenType.QUIZ
    questions: list[QuizQuestion]


class CheatSheetPayload(BasePayload):
    type: Literal[ScreenType.CHEAT_SHEET] = ScreenType.CHEAT_SHEET
    reference_id: str


class UnknownPayload(BasePayload):
    type: Literal[ScreenType.UNKNOWN] = ScreenType.UNKNOWN
    raw: str


ScreenPayload = Annotated[
    VideoPayload
    | ArticlePayload
    | SimulationPayload
    | QuizPayload
    | CheatSheetPayload
    | UnknownPayload,
    Field(discriminator="type"),
]
