"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

import {
  archiveCourseLesson,
  archiveLessonTask,
  createCourseLesson,
  createLessonTask,
  duplicateLessonTask,
  getCourseStructure,
  listCourseLessons,
  listLessonTasks,
  reorderCourseLesson,
  reorderLessonTask,
  updateLessonTask,
  validateCourse,
} from "@/features/catalog/builder-api";
import type {
  CourseCreateInput,
  CourseLessonDto,
  CourseReleaseCreateInput,
  CourseStatus,
  LessonTaskDto,
  ReleaseScreenInput,
  ReleaseStatus,
  TaskType,
} from "@/features/catalog/types";
import {
  createCourse,
  createCourseRelease,
} from "@/features/catalog/write-api";
import { buildSimulationScope } from "@/features/simulation/model/scope";
import { loadPreparedReleaseScreens } from "@/features/simulation/model/storage";
import type { AppLanguage } from "@/shared/i18n/lang";
import { getUiMessages } from "@/shared/i18n/messages";

import styles from "./catalog-write-panel.module.css";

type CatalogWritePanelProps = {
  selectedCourseId: string | null;
  language: AppLanguage;
};

type ScreenEditorMode = "builder" | "json";
type ScreenKind = "hero" | "text" | "image";

type ScreenDraft = {
  localId: string;
  screenKey: string;
  title: string;
  kind: ScreenKind;
  headline: string;
  body: string;
  assetKey: string;
};

type RequestState = {
  pending: boolean;
  message: string | null;
  isError: boolean;
};

const SCREEN_KEY_PATTERN = /^[a-z0-9][a-z0-9_.-]{2,119}$/;

const DEFAULT_RELEASE_SCREENS = JSON.stringify(
  [
    {
      screen_key: "intro_home",
      title: "Intro Screen",
      order_index: 1,
      payload: {
        type: "image",
        title: "Welcome",
        body: "Start learning from the first screen.",
        asset_key: "intro_home.png",
      },
    },
  ],
  null,
  2,
);

let screenDraftCounter = 0;

function nextScreenLocalId(): string {
  screenDraftCounter += 1;
  return `screen-${screenDraftCounter}`;
}

function createScreenDraft(order: number): ScreenDraft {
  return {
    localId: nextScreenLocalId(),
    screenKey: `screen_${order}`,
    title: "",
    kind: "hero",
    headline: "",
    body: "",
    assetKey: "",
  };
}

function initialState(): RequestState {
  return {
    pending: false,
    message: null,
    isError: false,
  };
}

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function parseScreens(
  value: string,
  errorMessages: {
    invalidJson: string;
    emptyArray: string;
  },
): ReleaseScreenInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(errorMessages.invalidJson);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(errorMessages.emptyArray);
  }
  return parsed as ReleaseScreenInput[];
}

function buildScreensFromDrafts(
  drafts: ScreenDraft[],
  errorMessages: {
    emptyArray: string;
    invalidScreenKey: string;
    invalidScreenTitle: string;
    imageScreenAssetRequired: string;
  },
): ReleaseScreenInput[] {
  if (drafts.length === 0) {
    throw new Error(errorMessages.emptyArray);
  }

  return drafts.map((draft, index) => {
    const screenKey = draft.screenKey.trim();
    if (!SCREEN_KEY_PATTERN.test(screenKey)) {
      throw new Error(`${errorMessages.invalidScreenKey} (#${index + 1})`);
    }

    const screenTitle = draft.title.trim();
    if (screenTitle.length < 2) {
      throw new Error(`${errorMessages.invalidScreenTitle} (#${index + 1})`);
    }

    const payload: Record<string, unknown> = {
      type: draft.kind,
    };

    const headline = draft.headline.trim();
    if (headline) {
      payload.title = headline;
    }

    const body = draft.body.trim();
    if (body) {
      payload.body = body;
    }

    const assetKey = draft.assetKey.trim();
    if (draft.kind === "image") {
      if (!assetKey) {
        throw new Error(
          `${errorMessages.imageScreenAssetRequired} (#${index + 1})`,
        );
      }
      payload.asset_key = assetKey;
    }

    return {
      screen_key: screenKey,
      title: screenTitle,
      order_index: index + 1,
      payload,
    };
  });
}

export function CatalogWritePanel({
  selectedCourseId,
  language,
}: CatalogWritePanelProps) {
  const messages = getUiMessages(language);
  const simulationScope = buildSimulationScope({ courseId: selectedCourseId });
  const loadFromSimulationBuilderLabel =
    language === "ru"
      ? "Загрузить из конструктора"
      : "Load from simulation builder";
  const openSimulationBuilderLabel =
    language === "ru"
      ? "Открыть конструктор симуляций"
      : "Open simulation builder";
  const simulationDataMissingLabel =
    language === "ru"
      ? "Сначала подготовьте JSON в разделе «Конструктор симуляций»."
      : "Prepare JSON first in the Simulation Builder.";
  const simulationBuilderHref = selectedCourseId
    ? `/simulation-v2?lang=${language}&courseId=${selectedCourseId}`
    : `/simulation-v2?lang=${language}`;

  const [courseSlug, setCourseSlug] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseStatus, setCourseStatus] = useState<CourseStatus>("draft");
  const [courseState, setCourseState] = useState<RequestState>(initialState);

  const [releaseVersion, setReleaseVersion] = useState("1.0.0");
  const [releaseChangelog, setReleaseChangelog] = useState("");
  const [releaseStatus, setReleaseStatus] = useState<ReleaseStatus>("draft");
  const [screenEditorMode, setScreenEditorMode] =
    useState<ScreenEditorMode>("builder");
  const [screenDrafts, setScreenDrafts] = useState<ScreenDraft[]>([
    {
      localId: nextScreenLocalId(),
      screenKey: "intro_home",
      title: "Intro Screen",
      kind: "image",
      headline: "Welcome",
      body: "Start learning from the first screen.",
      assetKey: "intro_home.png",
    },
  ]);
  const [releaseScreens, setReleaseScreens] = useState(DEFAULT_RELEASE_SCREENS);
  const [releaseState, setReleaseState] = useState<RequestState>(initialState);

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessons, setLessons] = useState<CourseLessonDto[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<LessonTaskDto[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("theory_text");
  const [lessonState, setLessonState] = useState<RequestState>(initialState);
  const [taskState, setTaskState] = useState<RequestState>(initialState);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskPayload, setTaskPayload] = useState<Record<string, unknown>>({});

  // Builder actions state
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: Array<{ type: string; message: string }>;
    warnings: Array<{ type: string; message: string }>;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [courseStructure, setCourseStructure] = useState<{
    course_id: string;
    course_title: string;
    lessons: Array<{
      id: string;
      title: string;
      tasks: Array<{ id: string; task_type: string; title: string }>;
    }>;
  } | null>(null);
  const [builderPending, setBuilderPending] = useState(false);

  const updateScreenDraft = (localId: string, patch: Partial<ScreenDraft>) => {
    setScreenDrafts((previous) =>
      previous.map((screen) =>
        screen.localId === localId ? { ...screen, ...patch } : screen,
      ),
    );
  };

  const handleAddScreen = () => {
    setScreenDrafts((previous) => [
      ...previous,
      createScreenDraft(previous.length + 1),
    ]);
  };

  const handleRemoveScreen = (localId: string) => {
    setScreenDrafts((previous) => {
      if (previous.length <= 1) {
        return previous;
      }
      return previous.filter((screen) => screen.localId !== localId);
    });
  };

  const handleSwitchToBuilderMode = () => {
    setScreenEditorMode("builder");
  };

  const handleSwitchToJsonMode = () => {
    try {
      const screens = buildScreensFromDrafts(screenDrafts, {
        emptyArray: messages.writePanel.emptyScreensJson,
        invalidScreenKey: messages.writePanel.invalidScreenKey,
        invalidScreenTitle: messages.writePanel.invalidScreenTitle,
        imageScreenAssetRequired: messages.writePanel.imageScreenAssetRequired,
      });
      setReleaseScreens(JSON.stringify(screens, null, 2));
    } catch {
      // Keep current JSON if constructor data is incomplete.
    }
    setScreenEditorMode("json");
  };

  useEffect(() => {
    let isMounted = true;

    if (!selectedCourseId) {
      return;
    }

    const load = async () => {
      try {
        const loadedLessons = await listCourseLessons(selectedCourseId);
        if (!isMounted) return;
        setLessons(loadedLessons);
        setSelectedLessonId((previous) => {
          if (
            previous &&
            loadedLessons.some((lesson) => lesson.id === previous)
          ) {
            return previous;
          }
          return loadedLessons[0]?.id ?? null;
        });
      } catch (error) {
        if (!isMounted) return;
        setLessonState({
          pending: false,
          message:
            error instanceof Error ? error.message : "Failed to load lessons.",
          isError: true,
        });
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [selectedCourseId]);

  useEffect(() => {
    let isMounted = true;

    if (!selectedLessonId) {
      return;
    }

    const load = async () => {
      try {
        const loadedTasks = await listLessonTasks(selectedLessonId);
        if (!isMounted) return;
        setTasks(loadedTasks);
      } catch (error) {
        if (!isMounted) return;
        setTaskState({
          pending: false,
          message:
            error instanceof Error ? error.message : "Failed to load tasks.",
          isError: true,
        });
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [selectedLessonId]);

  const refreshLessons = async () => {
    if (!selectedCourseId) {
      setLessons([]);
      setSelectedLessonId(null);
      return;
    }

    const loadedLessons = await listCourseLessons(selectedCourseId);
    setLessons(loadedLessons);
    setSelectedLessonId((previous) => {
      if (previous && loadedLessons.some((lesson) => lesson.id === previous)) {
        return previous;
      }
      return loadedLessons[0]?.id ?? null;
    });
  };

  const refreshTasks = async (lessonId: string | null) => {
    if (!lessonId) {
      setTasks([]);
      return;
    }
    const loadedTasks = await listLessonTasks(lessonId);
    setTasks(loadedTasks);
  };

  const handleArchiveLesson = async (lessonId: string) => {
    setLessonState({ pending: true, message: null, isError: false });
    try {
      await archiveCourseLesson(lessonId);
      setLessonState({
        pending: false,
        message: language === "ru" ? "Урок архивирован." : "Lesson archived.",
        isError: false,
      });
      await refreshLessons();
    } catch (error) {
      setLessonState({
        pending: false,
        message:
          error instanceof Error ? error.message : "Failed to archive lesson.",
        isError: true,
      });
    }
  };

  const handleMoveLesson = async (
    lessonId: string,
    direction: "up" | "down",
  ) => {
    if (!selectedCourseId) return;
    const currentLesson = lessons.find((l) => l.id === lessonId);
    if (!currentLesson) return;
    const currentIndex = lessons.indexOf(currentLesson);
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= lessons.length) return;
    setLessonState({ pending: true, message: null, isError: false });
    try {
      await reorderCourseLesson(selectedCourseId, lessonId, {
        order_index: newIndex + 1,
      });
      await refreshLessons();
    } catch (error) {
      setLessonState({
        pending: false,
        message:
          error instanceof Error ? error.message : "Failed to reorder lesson.",
        isError: true,
      });
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    if (!selectedLessonId) return;
    setTaskState({ pending: true, message: null, isError: false });
    try {
      await archiveLessonTask(taskId);
      setTaskState({
        pending: false,
        message: language === "ru" ? "Задание удалено." : "Task removed.",
        isError: false,
      });
      await refreshTasks(selectedLessonId);
    } catch (error) {
      setTaskState({
        pending: false,
        message:
          error instanceof Error ? error.message : "Failed to remove task.",
        isError: true,
      });
    }
  };

  const handleDuplicateTask = async (taskId: string) => {
    if (!selectedLessonId) return;
    setTaskState({ pending: true, message: null, isError: false });
    try {
      await duplicateLessonTask(taskId);
      setTaskState({
        pending: false,
        message:
          language === "ru" ? "Задание скопировано." : "Task duplicated.",
        isError: false,
      });
      await refreshTasks(selectedLessonId);
    } catch (error) {
      setTaskState({
        pending: false,
        message:
          error instanceof Error ? error.message : "Failed to duplicate task.",
        isError: true,
      });
    }
  };

  const handleMoveTask = async (taskId: string, direction: "up" | "down") => {
    if (!selectedLessonId) return;
    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask) return;
    const currentIndex = tasks.indexOf(currentTask);
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= tasks.length) return;
    setTaskState({ pending: true, message: null, isError: false });
    try {
      await reorderLessonTask(selectedLessonId, taskId, {
        order_index: newIndex + 1,
      });
      await refreshTasks(selectedLessonId);
    } catch (error) {
      setTaskState({
        pending: false,
        message:
          error instanceof Error ? error.message : "Failed to reorder task.",
        isError: true,
      });
    }
  };

  const handleEditTask = (task: LessonTaskDto) => {
    setEditingTaskId(task.id);
    setTaskPayload(task.payload);
    setTaskTitle(task.title);
    setTaskType(task.task_type as TaskType);
  };

  const handleCancelEditTask = () => {
    setEditingTaskId(null);
    setTaskPayload({});
    setTaskTitle("");
    setTaskType("theory_text");
  };

  const handleSaveTask = async () => {
    if (!editingTaskId) return;
    setTaskState({ pending: true, message: null, isError: false });
    try {
      await updateLessonTask(editingTaskId, {
        title: taskTitle,
        required: true,
        payload: taskPayload,
      });
      setTaskState({
        pending: false,
        message: language === "ru" ? "Задание сохранено." : "Task saved.",
        isError: false,
      });
      setEditingTaskId(null);
      setTaskPayload({});
      setTaskTitle("");
      setTaskType("theory_text");
      if (selectedLessonId) {
        await refreshTasks(selectedLessonId);
      }
    } catch (error) {
      setTaskState({
        pending: false,
        message:
          error instanceof Error ? error.message : "Failed to save task.",
        isError: true,
      });
    }
  };

  const handleLessonSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCourseId) {
      setLessonState({
        pending: false,
        message: messages.writePanel.selectCourseBeforeRelease,
        isError: true,
      });
      return;
    }

    setLessonState({ pending: true, message: null, isError: false });
    try {
      await createCourseLesson(selectedCourseId, {
        title: lessonTitle,
        description: normalizeOptionalText(lessonDescription),
      });
      setLessonTitle("");
      setLessonDescription("");
      setLessonState({
        pending: false,
        message: language === "ru" ? "Урок создан." : "Lesson created.",
        isError: false,
      });
      await refreshLessons();
    } catch (error) {
      setLessonState({
        pending: false,
        message:
          error instanceof Error ? error.message : "Failed to create lesson.",
        isError: true,
      });
    }
  };

  const handleTaskSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLessonId) {
      setTaskState({
        pending: false,
        message: language === "ru" ? "Выберите урок." : "Select lesson first.",
        isError: true,
      });
      return;
    }

    setTaskState({ pending: true, message: null, isError: false });
    try {
      await createLessonTask(selectedLessonId, {
        task_type: taskType,
        title: taskTitle,
        required: true,
        payload: { type: taskType, content: "" },
      });
      setTaskTitle("");
      setTaskState({
        pending: false,
        message: language === "ru" ? "Задание добавлено." : "Task added.",
        isError: false,
      });
      await refreshTasks(selectedLessonId);
    } catch (error) {
      setTaskState({
        pending: false,
        message:
          error instanceof Error ? error.message : "Failed to create task.",
        isError: true,
      });
    }
  };

  const handleValidateCourse = async () => {
    if (!selectedCourseId) return;
    setBuilderPending(true);
    setValidationResult(null);
    try {
      const result = await validateCourse(selectedCourseId);
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        valid: false,
        errors: [
          {
            type: "error",
            message:
              error instanceof Error ? error.message : "Validation failed",
          },
        ],
        warnings: [],
      });
    } finally {
      setBuilderPending(false);
    }
  };

  const handleShowPreview = async () => {
    if (!selectedCourseId) return;
    setBuilderPending(true);
    try {
      const structure = await getCourseStructure(selectedCourseId);
      setCourseStructure(structure);
      setShowPreview(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to load preview");
    } finally {
      setBuilderPending(false);
    }
  };

  const handleCourseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCourseState({ pending: true, message: null, isError: false });
    try {
      const payload: CourseCreateInput = {
        slug: courseSlug,
        title: courseTitle,
        description: normalizeOptionalText(courseDescription),
        status: courseStatus,
      };
      const createdCourse = await createCourse(payload);
      setCourseState({
        pending: false,
        message: messages.writePanel.courseCreated(createdCourse.title),
        isError: false,
      });
      window.location.assign(
        `/catalog?courseId=${createdCourse.id}&lang=${language}`,
      );
    } catch (error) {
      setCourseState({
        pending: false,
        message:
          error instanceof Error
            ? error.message
            : messages.writePanel.createCourseErrorFallback,
        isError: true,
      });
    }
  };

  const handleReleaseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCourseId) {
      setReleaseState({
        pending: false,
        message: messages.writePanel.selectCourseBeforeRelease,
        isError: true,
      });
      return;
    }

    setReleaseState({ pending: true, message: null, isError: false });
    try {
      const screens =
        screenEditorMode === "json"
          ? parseScreens(releaseScreens, {
              invalidJson: messages.writePanel.invalidScreensJson,
              emptyArray: messages.writePanel.emptyScreensJson,
            })
          : buildScreensFromDrafts(screenDrafts, {
              emptyArray: messages.writePanel.emptyScreensJson,
              invalidScreenKey: messages.writePanel.invalidScreenKey,
              invalidScreenTitle: messages.writePanel.invalidScreenTitle,
              imageScreenAssetRequired:
                messages.writePanel.imageScreenAssetRequired,
            });

      const payload: CourseReleaseCreateInput = {
        version: releaseVersion.trim(),
        changelog: normalizeOptionalText(releaseChangelog),
        status: releaseStatus,
        screens,
      };
      const release = await createCourseRelease(selectedCourseId, payload);
      setReleaseState({
        pending: false,
        message: messages.writePanel.releaseCreated(release.version),
        isError: false,
      });
      window.location.assign(
        `/catalog?courseId=${selectedCourseId}&lang=${language}`,
      );
    } catch (error) {
      setReleaseState({
        pending: false,
        message:
          error instanceof Error
            ? error.message
            : messages.writePanel.createReleaseErrorFallback,
        isError: true,
      });
    }
  };

  const handleLoadFromSimulationBuilder = () => {
    const prepared =
      loadPreparedReleaseScreens(simulationScope.scopeKey) ??
      loadPreparedReleaseScreens();
    if (!prepared || prepared.length === 0) {
      setReleaseState({
        pending: false,
        message: simulationDataMissingLabel,
        isError: true,
      });
      return;
    }

    setReleaseScreens(JSON.stringify(prepared, null, 2));
    setScreenEditorMode("json");
    setReleaseState({
      pending: false,
      message: null,
      isError: false,
    });
  };

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>{messages.writePanel.title}</h2>
      <p className={styles.hint}>{messages.writePanel.hint}</p>

      <section className={styles.form}>
        <h3 className={styles.formTitle}>
          {language === "ru" ? "Конструктор уроков" : "Lesson Builder"}
        </h3>

        <form className={styles.inlineForm} onSubmit={handleLessonSubmit}>
          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>
                {language === "ru" ? "Название урока" : "Lesson title"}
              </span>
              <input
                className={styles.input}
                value={lessonTitle}
                onChange={(event) => setLessonTitle(event.target.value)}
                placeholder={
                  language === "ru" ? "Введите название" : "Enter title"
                }
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>
                {language === "ru" ? "Описание" : "Description"}
              </span>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                value={lessonDescription}
                onChange={(event) => setLessonDescription(event.target.value)}
                placeholder={
                  language === "ru" ? "Введите описание" : "Enter description"
                }
              />
            </label>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.button}
              disabled={lessonState.pending || !selectedCourseId}
              type="submit"
            >
              {lessonState.pending
                ? language === "ru"
                  ? "Создание..."
                  : "Creating..."
                : language === "ru"
                  ? "Добавить урок"
                  : "Add lesson"}
            </button>
          </div>
          {lessonState.message && (
            <p
              className={`${styles.message} ${lessonState.isError ? styles.error : styles.ok}`}
            >
              {lessonState.message}
            </p>
          )}
        </form>

        <div className={styles.lessonList}>
          <h4 className={styles.subTitle}>
            {language === "ru" ? "Уроки курса" : "Course lessons"}
          </h4>
          {lessons.length === 0 ? (
            <p className={styles.emptyText}>
              {language === "ru" ? "Нет уроков" : "No lessons yet"}
            </p>
          ) : (
            <ul className={styles.simpleList}>
              {lessons.map((lesson, index) => (
                <li
                  key={lesson.id}
                  className={`${styles.listItem} ${selectedLessonId === lesson.id ? styles.listItemActive : ""}`}
                  onClick={() => setSelectedLessonId(lesson.id)}
                >
                  <div className={styles.itemHeader}>
                    <strong>{lesson.title}</strong>
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.smallButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveLesson(lesson.id, "up");
                        }}
                        disabled={index === 0}
                        title={language === "ru" ? "Вверх" : "Move up"}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.smallButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveLesson(lesson.id, "down");
                        }}
                        disabled={index === lessons.length - 1}
                        title={language === "ru" ? "Вниз" : "Move down"}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={styles.smallButtonDanger}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveLesson(lesson.id);
                        }}
                        title={language === "ru" ? "Удалить" : "Delete"}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <span className={styles.listMeta}>
                    {lesson.description ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedLessonId && (
          <div className={styles.taskSection}>
            <h4 className={styles.subTitle}>
              {language === "ru" ? "Задания урока" : "Lesson tasks"}
            </h4>

            <form className={styles.inlineForm} onSubmit={handleTaskSubmit}>
              <div className={styles.row}>
                <label className={styles.field}>
                  <span className={styles.label}>
                    {language === "ru" ? "Тип задания" : "Task type"}
                  </span>
                  <select
                    className={styles.input}
                    value={taskType}
                    onChange={(event) =>
                      setTaskType(event.target.value as TaskType)
                    }
                  >
                    <option value="theory_text">
                      {language === "ru" ? "Теория (текст)" : "Theory (text)"}
                    </option>
                    <option value="theory_video">
                      {language === "ru" ? "Теория (видео)" : "Theory (video)"}
                    </option>
                    <option value="quiz">
                      {language === "ru" ? "Тест" : "Quiz"}
                    </option>
                    <option value="simulation">
                      {language === "ru" ? "Симуляция" : "Simulation"}
                    </option>
                    <option value="cheat_sheet">
                      {language === "ru" ? "Памятка" : "Cheat sheet"}
                    </option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>
                    {language === "ru" ? "Название" : "Title"}
                  </span>
                  <input
                    className={styles.input}
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder={
                      language === "ru" ? "Введите название" : "Enter title"
                    }
                    required
                  />
                </label>
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.button}
                  disabled={taskState.pending}
                  type="submit"
                >
                  {taskState.pending
                    ? language === "ru"
                      ? "Добавление..."
                      : "Adding..."
                    : language === "ru"
                      ? "Добавить задание"
                      : "Add task"}
                </button>
              </div>
              {taskState.message && (
                <p
                  className={`${styles.message} ${taskState.isError ? styles.error : styles.ok}`}
                >
                  {taskState.message}
                </p>
              )}
            </form>

            <div className={styles.taskList}>
              {tasks.length === 0 ? (
                <p className={styles.emptyText}>
                  {language === "ru" ? "Нет заданий" : "No tasks yet"}
                </p>
              ) : (
                <ul className={styles.simpleList}>
                  {tasks.map((task, index) => (
                    <li key={task.id} className={styles.listItem}>
                      <div className={styles.taskHeader}>
                        <strong>{task.title}</strong>
                        <div className={styles.itemActions}>
                          <button
                            type="button"
                            className={styles.smallButton}
                            onClick={() => handleMoveTask(task.id, "up")}
                            disabled={index === 0}
                            title={language === "ru" ? "Вверх" : "Move up"}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className={styles.smallButton}
                            onClick={() => handleMoveTask(task.id, "down")}
                            disabled={index === tasks.length - 1}
                            title={language === "ru" ? "Вниз" : "Move down"}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className={styles.smallButton}
                            onClick={() => handleDuplicateTask(task.id)}
                            title={
                              language === "ru" ? "Копировать" : "Duplicate"
                            }
                          >
                            ⧉
                          </button>
                          <button
                            type="button"
                            className={styles.smallButton}
                            onClick={() => handleEditTask(task)}
                            title={language === "ru" ? "Редактировать" : "Edit"}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className={styles.smallButtonDanger}
                            onClick={() => handleArchiveTask(task.id)}
                            title={language === "ru" ? "Удалить" : "Delete"}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className={styles.taskMetaRow}>
                        <span className={styles.taskTypeBadge}>
                          {task.task_type}
                        </span>
                        <span className={styles.listMeta}>
                          {task.required
                            ? language === "ru"
                              ? "обязательно"
                              : "required"
                            : language === "ru"
                              ? "необязательно"
                              : "optional"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {editingTaskId && (
              <div className={styles.taskEditPanel}>
                <h4 className={styles.subTitle}>
                  {language === "ru" ? "Редактирование задания" : "Edit task"}
                </h4>

                <div className={styles.row}>
                  <label className={styles.field}>
                    <span className={styles.label}>
                      {language === "ru" ? "Название" : "Title"}
                    </span>
                    <input
                      className={styles.input}
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      required
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>
                      {language === "ru" ? "Тип" : "Type"}
                    </span>
                    <select
                      className={styles.input}
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value as TaskType)}
                      disabled
                    >
                      <option value="theory_text">
                        {language === "ru" ? "Теория (текст)" : "Theory (text)"}
                      </option>
                      <option value="theory_video">
                        {language === "ru"
                          ? "Теория (видео)"
                          : "Theory (video)"}
                      </option>
                      <option value="quiz">
                        {language === "ru" ? "Тест" : "Quiz"}
                      </option>
                      <option value="simulation">
                        {language === "ru" ? "Симуляция" : "Simulation"}
                      </option>
                      <option value="cheat_sheet">
                        {language === "ru" ? "Памятка" : "Cheat sheet"}
                      </option>
                    </select>
                  </label>
                </div>

                {taskType === "theory_text" && (
                  <label className={styles.field}>
                    <span className={styles.label}>
                      {language === "ru"
                        ? "Содержание (Markdown)"
                        : "Content (Markdown)"}
                    </span>
                    <textarea
                      className={`${styles.input} ${styles.textarea}`}
                      value={(taskPayload.content as string) ?? ""}
                      onChange={(e) =>
                        setTaskPayload({
                          ...taskPayload,
                          content: e.target.value,
                        })
                      }
                      placeholder={
                        language === "ru" ? "Введите текст..." : "Enter text..."
                      }
                    />
                  </label>
                )}

                {taskType === "theory_video" && (
                  <>
                    <div className={styles.row}>
                      <label className={styles.field}>
                        <span className={styles.label}>
                          {language === "ru" ? "URL видео" : "Video URL"}
                        </span>
                        <input
                          className={styles.input}
                          value={(taskPayload.video_url as string) ?? ""}
                          onChange={(e) =>
                            setTaskPayload({
                              ...taskPayload,
                              video_url: e.target.value,
                            })
                          }
                          placeholder="https://..."
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>
                          {language === "ru"
                            ? "Длительность (сек)"
                            : "Duration (sec)"}
                        </span>
                        <input
                          className={styles.input}
                          type="number"
                          value={(taskPayload.duration as number) ?? 0}
                          onChange={(e) =>
                            setTaskPayload({
                              ...taskPayload,
                              duration: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </label>
                    </div>
                    <label className={styles.field}>
                      <span className={styles.label}>
                        {language === "ru" ? "Транскрипт" : "Transcript"}
                      </span>
                      <textarea
                        className={`${styles.input} ${styles.textarea}`}
                        value={(taskPayload.transcript as string) ?? ""}
                        onChange={(e) =>
                          setTaskPayload({
                            ...taskPayload,
                            transcript: e.target.value,
                          })
                        }
                      />
                    </label>
                  </>
                )}

                {taskType === "quiz" && (
                  <label className={styles.field}>
                    <span className={styles.label}>
                      {language === "ru"
                        ? "Вопросы (JSON)"
                        : "Questions (JSON)"}
                    </span>
                    <textarea
                      className={`${styles.input} ${styles.codearea}`}
                      value={JSON.stringify(
                        taskPayload.questions ?? [],
                        null,
                        2,
                      )}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setTaskPayload({ ...taskPayload, questions: parsed });
                        } catch {
                          // ignore invalid JSON while typing
                        }
                      }}
                      placeholder='[{"question": "...", "options": [...], "correct": 0}]'
                    />
                  </label>
                )}

                {taskType === "simulation" && (
                  <label className={styles.field}>
                    <span className={styles.label}>
                      {language === "ru"
                        ? "Конфигурация симуляции (JSON)"
                        : "Simulation config (JSON)"}
                    </span>
                    <textarea
                      className={`${styles.input} ${styles.codearea}`}
                      value={JSON.stringify(taskPayload.config ?? {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setTaskPayload({ ...taskPayload, config: parsed });
                        } catch {
                          // ignore
                        }
                      }}
                      placeholder='{"image": "...", "hotspots": [...]}'
                    />
                  </label>
                )}

                {taskType === "cheat_sheet" && (
                  <label className={styles.field}>
                    <span className={styles.label}>
                      {language === "ru" ? "Содержание" : "Content"}
                    </span>
                    <textarea
                      className={`${styles.input} ${styles.textarea}`}
                      value={(taskPayload.content as string) ?? ""}
                      onChange={(e) =>
                        setTaskPayload({
                          ...taskPayload,
                          content: e.target.value,
                        })
                      }
                      placeholder={
                        language === "ru" ? "Памятка..." : "Cheat sheet..."
                      }
                    />
                  </label>
                )}

                <div className={styles.actions}>
                  <button
                    className={styles.button}
                    disabled={taskState.pending}
                    type="button"
                    onClick={handleSaveTask}
                  >
                    {taskState.pending
                      ? language === "ru"
                        ? "Сохранение..."
                        : "Saving..."
                      : language === "ru"
                        ? "Сохранить"
                        : "Save"}
                  </button>
                  <button
                    className={styles.ghostButton}
                    type="button"
                    onClick={handleCancelEditTask}
                  >
                    {language === "ru" ? "Отмена" : "Cancel"}
                  </button>
                </div>
                {taskState.message && (
                  <p
                    className={`${styles.message} ${taskState.isError ? styles.error : styles.ok}`}
                  >
                    {taskState.message}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {selectedCourseId && (
        <div className={styles.builderActions}>
          <h4 className={styles.subTitle}>
            {language === "ru" ? "Действия конструктора" : "Builder Actions"}
          </h4>
          <div className={styles.actionButtons}>
            <button
              className={styles.button}
              type="button"
              disabled={builderPending}
              onClick={handleValidateCourse}
            >
              {builderPending
                ? language === "ru"
                  ? "Проверка..."
                  : "Validating..."
                : language === "ru"
                  ? "Проверить"
                  : "Validate"}
            </button>
            <button
              className={styles.button}
              type="button"
              disabled={builderPending}
              onClick={handleShowPreview}
            >
              {language === "ru" ? "Предпросмотр" : "Preview"}
            </button>
          </div>

          {validationResult && (
            <div className={styles.validationResults}>
              {validationResult.valid ? (
                <p className={styles.ok}>
                  {language === "ru"
                    ? "Курс прошёл проверку!"
                    : "Course validation passed!"}
                </p>
              ) : (
                <p className={styles.error}>
                  {language === "ru"
                    ? `Найдено ошибок: ${validationResult.errors.length}`
                    : `Errors found: ${validationResult.errors.length}`}
                </p>
              )}
              {validationResult.errors.length > 0 && (
                <ul className={styles.errorList}>
                  {validationResult.errors.map((err, i) => (
                    <li key={i} className={styles.errorItem}>
                      {err.message}
                    </li>
                  ))}
                </ul>
              )}
              {validationResult.warnings.length > 0 && (
                <>
                  <p className={styles.warning}>
                    {language === "ru"
                      ? `Предупреждений: ${validationResult.warnings.length}`
                      : `Warnings: ${validationResult.warnings.length}`}
                  </p>
                  <ul className={styles.warningList}>
                    {validationResult.warnings.map((warn, i) => (
                      <li key={i} className={styles.warningItem}>
                        {warn.message}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {showPreview && courseStructure && (
        <div className={styles.previewModal}>
          <div className={styles.previewContent}>
            <div className={styles.previewHeader}>
              <h3>{courseStructure.course_title}</h3>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={() => setShowPreview(false)}
              >
                {language === "ru" ? "Закрыть" : "Close"}
              </button>
            </div>
            <div className={styles.previewBody}>
              {courseStructure.lessons.map((lesson, idx) => (
                <div key={lesson.id} className={styles.previewLesson}>
                  <h4>
                    {idx + 1}. {lesson.title}
                  </h4>
                  <ul className={styles.previewTasks}>
                    {lesson.tasks.map((task) => (
                      <li key={task.id}>
                        [{task.task_type}] {task.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={styles.forms}>
        <form className={styles.form} onSubmit={handleCourseSubmit}>
          <h3 className={styles.formTitle}>
            {messages.writePanel.createCourseTitle}
          </h3>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>
                {messages.writePanel.slugLabel}
              </span>
              <input
                className={styles.input}
                value={courseSlug}
                onChange={(event) => setCourseSlug(event.target.value)}
                placeholder={messages.writePanel.placeholderCourseSlug}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>
                {messages.writePanel.statusLabel}
              </span>
              <select
                className={styles.input}
                value={courseStatus}
                onChange={(event) =>
                  setCourseStatus(event.target.value as CourseStatus)
                }
              >
                <option value="draft">{messages.writePanel.draftStatus}</option>
                <option value="active">
                  {messages.writePanel.activeStatus}
                </option>
                <option value="archived">
                  {messages.writePanel.archivedStatus}
                </option>
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>
              {messages.writePanel.courseTitleLabel}
            </span>
            <input
              className={styles.input}
              value={courseTitle}
              onChange={(event) => setCourseTitle(event.target.value)}
              placeholder={messages.writePanel.placeholderCourseTitle}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              {messages.writePanel.descriptionLabel}
            </span>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={courseDescription}
              onChange={(event) => setCourseDescription(event.target.value)}
              placeholder={messages.writePanel.placeholderCourseDescription}
            />
          </label>

          <div className={styles.actions}>
            <button
              className={styles.button}
              disabled={courseState.pending}
              type="submit"
            >
              {courseState.pending
                ? messages.writePanel.creatingCourse
                : messages.writePanel.createCourse}
            </button>
          </div>
          {courseState.message && (
            <p
              className={`${styles.message} ${courseState.isError ? styles.error : styles.ok}`}
            >
              {courseState.message}
            </p>
          )}
        </form>

        <form className={styles.form} onSubmit={handleReleaseSubmit}>
          <h3 className={styles.formTitle}>
            {messages.writePanel.createReleaseTitle}
          </h3>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>
                {messages.writePanel.versionLabel}
              </span>
              <input
                className={styles.input}
                value={releaseVersion}
                onChange={(event) => setReleaseVersion(event.target.value)}
                placeholder={messages.writePanel.placeholderReleaseVersion}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>
                {messages.writePanel.statusLabel}
              </span>
              <select
                className={styles.input}
                value={releaseStatus}
                onChange={(event) =>
                  setReleaseStatus(event.target.value as ReleaseStatus)
                }
              >
                <option value="draft">{messages.writePanel.draftStatus}</option>
                <option value="published">
                  {messages.writePanel.publishedStatus}
                </option>
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>
              {messages.writePanel.changelogLabel}
            </span>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={releaseChangelog}
              onChange={(event) => setReleaseChangelog(event.target.value)}
              placeholder={messages.writePanel.placeholderReleaseChangelog}
            />
          </label>

          <div className={styles.screenEditorHeader}>
            <span className={styles.label}>
              {messages.writePanel.screensEditorLabel}
            </span>
            <div className={styles.screenEditorActions}>
              <div className={styles.modeSwitch}>
                <button
                  type="button"
                  className={`${styles.modeButton} ${screenEditorMode === "builder" ? styles.modeButtonActive : ""}`}
                  onClick={handleSwitchToBuilderMode}
                >
                  {messages.writePanel.screensBuilderMode}
                </button>
                <button
                  type="button"
                  className={`${styles.modeButton} ${screenEditorMode === "json" ? styles.modeButtonActive : ""}`}
                  onClick={handleSwitchToJsonMode}
                >
                  {messages.writePanel.screensJsonMode}
                </button>
              </div>
              <button
                type="button"
                className={styles.inlineAction}
                onClick={handleLoadFromSimulationBuilder}
              >
                {loadFromSimulationBuilderLabel}
              </button>
              <Link
                className={styles.inlineAction}
                href={simulationBuilderHref}
              >
                {openSimulationBuilderLabel}
              </Link>
            </div>
          </div>

          {screenEditorMode === "builder" ? (
            <div className={styles.screenBuilder}>
              <p className={styles.builderHint}>
                {messages.writePanel.screensBuilderHint}
              </p>
              {screenDrafts.map((screen, index) => (
                <article className={styles.screenCard} key={screen.localId}>
                  <div className={styles.screenCardHeader}>
                    <strong className={styles.screenCardTitle}>
                      {messages.writePanel.screenCardLabel(index + 1)}
                    </strong>
                    <button
                      type="button"
                      className={styles.inlineAction}
                      onClick={() => handleRemoveScreen(screen.localId)}
                      disabled={screenDrafts.length <= 1}
                    >
                      {messages.writePanel.removeScreen}
                    </button>
                  </div>

                  <div className={styles.row}>
                    <label className={styles.field}>
                      <span className={styles.label}>
                        {messages.writePanel.screenKeyLabel}
                      </span>
                      <input
                        className={styles.input}
                        value={screen.screenKey}
                        onChange={(event) =>
                          updateScreenDraft(screen.localId, {
                            screenKey: event.target.value,
                          })
                        }
                        placeholder={messages.writePanel.placeholderScreenKey}
                        required
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>
                        {messages.writePanel.screenTitleLabel}
                      </span>
                      <input
                        className={styles.input}
                        value={screen.title}
                        onChange={(event) =>
                          updateScreenDraft(screen.localId, {
                            title: event.target.value,
                          })
                        }
                        placeholder={messages.writePanel.placeholderScreenTitle}
                        required
                      />
                    </label>
                  </div>

                  <div className={styles.row}>
                    <label className={styles.field}>
                      <span className={styles.label}>
                        {messages.writePanel.screenTypeLabel}
                      </span>
                      <select
                        className={styles.input}
                        value={screen.kind}
                        onChange={(event) =>
                          updateScreenDraft(screen.localId, {
                            kind: event.target.value as ScreenKind,
                          })
                        }
                      >
                        <option value="hero">
                          {messages.writePanel.screenTypeHero}
                        </option>
                        <option value="text">
                          {messages.writePanel.screenTypeText}
                        </option>
                        <option value="image">
                          {messages.writePanel.screenTypeImage}
                        </option>
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>
                        {messages.writePanel.screenHeadlineLabel}
                      </span>
                      <input
                        className={styles.input}
                        value={screen.headline}
                        onChange={(event) =>
                          updateScreenDraft(screen.localId, {
                            headline: event.target.value,
                          })
                        }
                        placeholder={
                          messages.writePanel.placeholderScreenHeadline
                        }
                      />
                    </label>
                  </div>

                  <label className={styles.field}>
                    <span className={styles.label}>
                      {messages.writePanel.screenBodyLabel}
                    </span>
                    <textarea
                      className={`${styles.input} ${styles.textarea}`}
                      value={screen.body}
                      onChange={(event) =>
                        updateScreenDraft(screen.localId, {
                          body: event.target.value,
                        })
                      }
                      placeholder={messages.writePanel.placeholderScreenBody}
                    />
                  </label>

                  {screen.kind === "image" && (
                    <label className={styles.field}>
                      <span className={styles.label}>
                        {messages.writePanel.screenAssetKeyLabel}
                      </span>
                      <input
                        className={styles.input}
                        value={screen.assetKey}
                        onChange={(event) =>
                          updateScreenDraft(screen.localId, {
                            assetKey: event.target.value,
                          })
                        }
                        placeholder={
                          messages.writePanel.placeholderScreenAssetKey
                        }
                        required
                      />
                    </label>
                  )}
                </article>
              ))}

              <button
                type="button"
                className={styles.ghostButton}
                onClick={handleAddScreen}
              >
                {messages.writePanel.addScreen}
              </button>
            </div>
          ) : (
            <>
              <label className={styles.field}>
                <span className={styles.label}>
                  {messages.writePanel.screensJsonLabel}
                </span>
                <textarea
                  className={`${styles.input} ${styles.codearea}`}
                  value={releaseScreens}
                  onChange={(event) => setReleaseScreens(event.target.value)}
                  spellCheck={false}
                />
              </label>
              <p className={styles.builderHint}>
                {messages.writePanel.screensJsonHint}
              </p>
            </>
          )}

          <div className={styles.actions}>
            <button
              className={styles.button}
              disabled={releaseState.pending || !selectedCourseId}
              type="submit"
            >
              {releaseState.pending
                ? messages.writePanel.creatingRelease
                : messages.writePanel.createRelease}
            </button>
          </div>
          {releaseState.message && (
            <p
              className={`${styles.message} ${releaseState.isError ? styles.error : styles.ok}`}
            >
              {releaseState.message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
