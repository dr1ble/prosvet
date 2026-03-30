import type { AppLanguage } from "./lang";

type WritePanelMessages = {
  title: string;
  hint: string;
  createCourseTitle: string;
  createReleaseTitle: string;
  slugLabel: string;
  statusLabel: string;
  courseTitleLabel: string;
  descriptionLabel: string;
  versionLabel: string;
  changelogLabel: string;
  screensEditorLabel: string;
  screensBuilderMode: string;
  screensJsonMode: string;
  screensBuilderHint: string;
  screensJsonHint: string;
  addScreen: string;
  removeScreen: string;
  screenCardLabel: (order: number) => string;
  screenKeyLabel: string;
  screenTitleLabel: string;
  screenTypeLabel: string;
  screenHeadlineLabel: string;
  screenBodyLabel: string;
  screenAssetKeyLabel: string;
  screenTypeHero: string;
  screenTypeText: string;
  screenTypeImage: string;
  placeholderScreenKey: string;
  placeholderScreenTitle: string;
  placeholderScreenHeadline: string;
  placeholderScreenBody: string;
  placeholderScreenAssetKey: string;
  screensJsonLabel: string;
  createCourse: string;
  creatingCourse: string;
  createRelease: string;
  creatingRelease: string;
  draftStatus: string;
  activeStatus: string;
  archivedStatus: string;
  publishedStatus: string;
  placeholderCourseSlug: string;
  placeholderCourseTitle: string;
  placeholderCourseDescription: string;
  placeholderReleaseVersion: string;
  placeholderReleaseChangelog: string;
  courseCreated: (title: string) => string;
  releaseCreated: (version: string) => string;
  invalidScreensJson: string;
  emptyScreensJson: string;
  invalidScreenKey: string;
  invalidScreenTitle: string;
  imageScreenAssetRequired: string;
  selectCourseBeforeRelease: string;
  createCourseErrorFallback: string;
  createReleaseErrorFallback: string;
};

type AuthMessages = {
  title: string;
  subtitle: string;
  loginLabel: string;
  passwordLabel: string;
  signIn: string;
  signingIn: string;
  signInError: string;
  sessionCleared: string;
  logoutError: string;
  logout: string;
  openCatalog: string;
};

type HomeMessages = {
  title: string;
  subtitle: string;
  quickStartTitle: string;
  quickStartDescription: string;
  authCardTitle: string;
  authCardDescription: string;
  catalogCardTitle: string;
  catalogCardDescription: string;
  versionCardTitle: string;
  versionCardDescription: string;
  versionExample: string;
  openAuth: string;
  openCatalog: string;
};

type CatalogMessages = {
  title: string;
  subtitle: string;
  versionConceptHint: string;
  signInLink: string;
  coursesTitle: string;
  noCourses: string;
  loadCoursesErrorFallback: string;
  releasesTitle: string;
  releasePrefix: string;
  filterStatus: string;
  filterVersion: string;
  filterLimit: string;
  filterAll: string;
  filterApply: string;
  filterReset: string;
  chooseCourse: string;
  loadReleasesErrorFallback: string;
  adminSessionMissing: string;
  noReleases: string;
  screens: string;
  createdAt: string;
  publishedAt: string;
  statusDraft: string;
  statusPublished: string;
  statusActive: string;
  statusArchived: string;
};

export type UiMessages = {
  languageLabel: string;
  home: HomeMessages;
  auth: AuthMessages;
  catalog: CatalogMessages;
  writePanel: WritePanelMessages;
};

const ru: UiMessages = {
  languageLabel: "Язык",
  home: {
    title: "Панель управления",
    subtitle: "Единая точка входа в инструменты администрирования платформы.",
    quickStartTitle: "Быстрый старт",
    quickStartDescription:
      "Выберите действие ниже. Карточки расположены в рекомендуемом порядке работы.",
    authCardTitle: "Войти",
    authCardDescription:
      "Авторизуйтесь и продолжите работу с функциями панели.",
    catalogCardTitle: "Управление каталогом",
    catalogCardDescription:
      "Создавайте и обновляйте учебные курсы и их версии.",
    versionCardTitle: "Что такое версия курса",
    versionCardDescription:
      "Версия курса — это готовый набор экранов и контента, который приложение скачивает для пользователя.",
    versionExample:
      "Пример: версия v1.2.0 может содержать новые экраны, тексты и порядок учебных шагов.",
    openAuth: "Войти",
    openCatalog: "Открыть каталог",
  },
  auth: {
    title: "Войдите",
    subtitle: "Введите логин и пароль для входа в панель.",
    loginLabel: "Логин",
    passwordLabel: "Пароль",
    signIn: "Войти",
    signingIn: "Вход...",
    signInError: "Не удалось выполнить вход.",
    sessionCleared: "Сессия очищена.",
    logoutError: "Не удалось выполнить выход.",
    logout: "Выйти",
    openCatalog: "Открыть каталог",
  },
  catalog: {
    title: "Каталог курсов",
    subtitle: "Управление курсами, версиями и контентом мобильного приложения.",
    versionConceptHint:
      "Версия курса — это конкретный набор экранов и контента (например, v1.0.0), который скачивает приложение.",
    signInLink: "Войти",
    coursesTitle: "Курсы",
    noCourses: "Курсы пока не созданы.",
    loadCoursesErrorFallback: "Не удалось загрузить курсы.",
    releasesTitle: "Версии курса",
    releasePrefix: "Версии курса",
    filterStatus: "Статус",
    filterVersion: "Номер версии",
    filterLimit: "Лимит",
    filterAll: "все",
    filterApply: "Применить",
    filterReset: "Сбросить",
    chooseCourse: "Выберите курс, чтобы просмотреть его версии.",
    loadReleasesErrorFallback: "Не удалось загрузить версии курса.",
    adminSessionMissing: "Сессия не найдена. Войдите через экран авторизации.",
    noReleases: "Для этого курса пока нет версий.",
    screens: "Экранов",
    createdAt: "Создан",
    publishedAt: "Опубликован",
    statusDraft: "черновик",
    statusPublished: "опубликован",
    statusActive: "активный",
    statusArchived: "архивный",
  },
  writePanel: {
    title: "Операции редактирования",
    hint: "Создавайте курс и его версии.",
    createCourseTitle: "Создать курс",
    createReleaseTitle: "Создать версию курса",
    slugLabel: "Код курса (slug)",
    statusLabel: "Статус",
    courseTitleLabel: "Название",
    descriptionLabel: "Описание",
    versionLabel: "Номер версии",
    changelogLabel: "Список изменений",
    screensEditorLabel: "Экраны версии",
    screensBuilderMode: "Конструктор",
    screensJsonMode: "JSON",
    screensBuilderHint:
      "Добавьте экраны в нужном порядке. Порядок карточек определяет порядок показа.",
    screensJsonHint:
      "Режим для ручного редактирования JSON. Используйте, если нужны нестандартные поля.",
    addScreen: "Добавить экран",
    removeScreen: "Удалить",
    screenCardLabel: (order: number) => `Экран ${order}`,
    screenKeyLabel: "Ключ экрана",
    screenTitleLabel: "Название экрана",
    screenTypeLabel: "Тип экрана",
    screenHeadlineLabel: "Заголовок",
    screenBodyLabel: "Текст/описание",
    screenAssetKeyLabel: "Ключ медиафайла",
    screenTypeHero: "Приветственный",
    screenTypeText: "Текстовый",
    screenTypeImage: "Изображение",
    placeholderScreenKey: "intro_home",
    placeholderScreenTitle: "Вводный экран",
    placeholderScreenHeadline: "Добро пожаловать",
    placeholderScreenBody: "Короткое пояснение для пользователя.",
    placeholderScreenAssetKey: "intro_home.png",
    screensJsonLabel: "JSON экранов",
    createCourse: "Создать курс",
    creatingCourse: "Создание...",
    createRelease: "Создать версию",
    creatingRelease: "Создание...",
    draftStatus: "черновик",
    activeStatus: "активный",
    archivedStatus: "архивный",
    publishedStatus: "опубликован",
    placeholderCourseSlug: "pozharnaya-bezopasnost-vvedenie",
    placeholderCourseTitle: "Основы пожарной безопасности",
    placeholderCourseDescription: "Короткое описание курса (необязательно).",
    placeholderReleaseVersion: "1.0.0",
    placeholderReleaseChangelog:
      "Что изменилось в этой версии (необязательно).",
    courseCreated: (title: string) => `Курс «${title}» создан.`,
    releaseCreated: (version: string) => `Версия v${version} создана.`,
    invalidScreensJson: "Некорректный JSON в поле экранов.",
    emptyScreensJson: "JSON экранов должен содержать непустой массив.",
    invalidScreenKey:
      "Некорректный ключ экрана. Используйте строчные буквы, цифры, точку, дефис или _.",
    invalidScreenTitle: "Название экрана слишком короткое.",
    imageScreenAssetRequired:
      "Для экрана типа «Изображение» укажите ключ медиафайла.",
    selectCourseBeforeRelease: "Сначала выберите курс, затем создайте версию.",
    createCourseErrorFallback: "Не удалось создать курс.",
    createReleaseErrorFallback: "Не удалось создать версию.",
  },
};

const en: UiMessages = {
  languageLabel: "Language",
  home: {
    title: "Control Dashboard",
    subtitle: "Single entry point for platform administration tools.",
    quickStartTitle: "Quick Start",
    quickStartDescription:
      "Choose an action below. Cards are ordered as the recommended workflow.",
    authCardTitle: "Sign in",
    authCardDescription: "Sign in to access administration features.",
    catalogCardTitle: "Catalog management",
    catalogCardDescription: "Create and manage courses and course versions.",
    versionCardTitle: "What is a course version",
    versionCardDescription:
      "A course version is a ready package of screens and content downloaded by the app for users.",
    versionExample:
      "Example: version v1.2.0 can include new screens, texts, and learning step order.",
    openAuth: "Sign in",
    openCatalog: "Open catalog",
  },
  auth: {
    title: "Sign in",
    subtitle: "Enter your login and password to access the dashboard.",
    loginLabel: "Login",
    passwordLabel: "Password",
    signIn: "Sign in",
    signingIn: "Signing in...",
    signInError: "Unable to sign in.",
    sessionCleared: "Session cleared.",
    logoutError: "Unable to logout.",
    logout: "Logout",
    openCatalog: "Open catalog",
  },
  catalog: {
    title: "Course Catalog",
    subtitle: "Manage courses, versions, and mobile content packages.",
    versionConceptHint:
      "A course version is a specific package of screens and content (for example v1.0.0) that the app downloads.",
    signInLink: "Sign in",
    coursesTitle: "Courses",
    noCourses: "No courses found yet.",
    loadCoursesErrorFallback: "Unable to load courses.",
    releasesTitle: "Course Versions",
    releasePrefix: "Course Versions",
    filterStatus: "Status",
    filterVersion: "Version Number",
    filterLimit: "Limit",
    filterAll: "all",
    filterApply: "Apply",
    filterReset: "Reset",
    chooseCourse: "Choose a course to inspect its versions.",
    loadReleasesErrorFallback: "Unable to load course versions.",
    adminSessionMissing: "Session not found. Sign in on the auth screen.",
    noReleases: "No versions created for this course yet.",
    screens: "Screens",
    createdAt: "Created",
    publishedAt: "Published",
    statusDraft: "draft",
    statusPublished: "published",
    statusActive: "active",
    statusArchived: "archived",
  },
  writePanel: {
    title: "Write Operations",
    hint: "Create a course and its versions.",
    createCourseTitle: "Create Course",
    createReleaseTitle: "Create Course Version",
    slugLabel: "Course Code (slug)",
    statusLabel: "Status",
    courseTitleLabel: "Title",
    descriptionLabel: "Description",
    versionLabel: "Version Number",
    changelogLabel: "Changelog",
    screensEditorLabel: "Version screens",
    screensBuilderMode: "Builder",
    screensJsonMode: "JSON",
    screensBuilderHint:
      "Add screens in the required order. Card order defines display order in the app.",
    screensJsonHint:
      "Manual JSON mode for advanced fields and custom payload structures.",
    addScreen: "Add screen",
    removeScreen: "Remove",
    screenCardLabel: (order: number) => `Screen ${order}`,
    screenKeyLabel: "Screen key",
    screenTitleLabel: "Screen title",
    screenTypeLabel: "Screen type",
    screenHeadlineLabel: "Headline",
    screenBodyLabel: "Body text",
    screenAssetKeyLabel: "Media asset key",
    screenTypeHero: "Hero",
    screenTypeText: "Text",
    screenTypeImage: "Image",
    placeholderScreenKey: "intro_home",
    placeholderScreenTitle: "Intro screen",
    placeholderScreenHeadline: "Welcome",
    placeholderScreenBody: "Short explanation for the learner.",
    placeholderScreenAssetKey: "intro_home.png",
    screensJsonLabel: "Screens JSON",
    createCourse: "Create course",
    creatingCourse: "Creating...",
    createRelease: "Create version",
    creatingRelease: "Creating...",
    draftStatus: "draft",
    activeStatus: "active",
    archivedStatus: "archived",
    publishedStatus: "published",
    placeholderCourseSlug: "fire-safety-intro",
    placeholderCourseTitle: "Fire Safety Basics",
    placeholderCourseDescription: "Short course description (optional).",
    placeholderReleaseVersion: "1.0.0",
    placeholderReleaseChangelog: "What changed in this version (optional).",
    courseCreated: (title: string) => `Course ${title} created.`,
    releaseCreated: (version: string) => `Version v${version} created.`,
    invalidScreensJson: "Screens JSON is invalid.",
    emptyScreensJson: "Screens JSON must be a non-empty array.",
    invalidScreenKey:
      "Invalid screen key. Use lowercase letters, digits, dot, hyphen, or underscore.",
    invalidScreenTitle: "Screen title is too short.",
    imageScreenAssetRequired: "Image screen requires a media asset key.",
    selectCourseBeforeRelease: "Select a course before creating a version.",
    createCourseErrorFallback: "Unable to create course.",
    createReleaseErrorFallback: "Unable to create version.",
  },
};

const messagesByLanguage: Record<AppLanguage, UiMessages> = {
  ru,
  en,
};

export function getUiMessages(language: AppLanguage): UiMessages {
  return messagesByLanguage[language];
}
