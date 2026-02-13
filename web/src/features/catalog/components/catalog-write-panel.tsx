"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import type {
  CourseCreateInput,
  CourseReleaseCreateInput,
  CourseStatus,
  ReleaseScreenInput,
  ReleaseStatus,
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
    ? `/simulation?lang=${language}&courseId=${selectedCourseId}`
    : `/simulation?lang=${language}`;

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
