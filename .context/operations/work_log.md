# Work Log

## Entry: 2026-04-22 (mobile: self progress API + backend-driven profile/home/catalog)

- **Date:** 2026-04-22
- **Task:** Continue removing mobile stubs by wiring user-facing learning progress from backend into profile, home, and catalog flows.
- **Decision/Change:**
  - Added backend self-progress endpoints in `progress` module for regular mobile users:
    - `GET /api/v1/progress/me`
    - `POST /api/v1/progress/lesson/self`
  - Added policy map entries for `progress.view.self` and `progress.upsert.self` so `USER` can access only own progress, while admin/staff policies stay intact.
  - Extended backend progress service/repository with self-summary aggregation (`get_my_progress(...)`) and added router/service coverage.
  - Added mobile progress stack:
    - `ProgressNetworkDataSource` + `KtorProgressNetworkDataSource`
    - `ProgressRepository` + `NetworkProgressRepository`
    - shared DI wiring in `mobile/shared/.../AppModule.kt`
    - shared progress models in `mobile/core/model/.../progress/`
  - Extended `ProfileUiState` and `ProfileViewModel` to load backend progress on init and clear it on logout.
  - Replaced profile progress placeholder/stub copy with real course progress cards and empty/loading states.
  - Synced backend progress from profile state into catalog state in `HomeRoute`, then used it to:
    - show backend-driven progress in home continue-learning card;
    - show per-course progress badges in catalog tiles and home recommendations.
- **Why:** Mobile progress UI was still partially fake/local. The backend already had progress aggregation logic, but it was not exposed to regular mobile users, so the correct next step was a thin self-only API plus repository wiring rather than more UI-local pseudo-state.
- **Files touched:**
  - `backend/app/modules/progress/api/*`
  - `backend/app/modules/progress/domain/services.py`
  - `backend/app/modules/progress/infra/repository.py`
  - `backend/app/shared/auth/policies.py`
  - `backend/tests/test_progress_api_router_branches.py`
  - `backend/tests/test_progress_service.py`
  - `mobile/core/model/.../progress/*`
  - `mobile/core/network/.../ProgressNetworkDataSource.kt`
  - `mobile/core/network/.../KtorProgressNetworkDataSource.kt`
  - `mobile/core/data/.../progress/*`
  - `mobile/shared/src/commonMain/kotlin/com/digitaledu/shared/di/AppModule.kt`
  - `mobile/feature/profile/api/ProfileUiState.kt`
  - `mobile/feature/profile/impl/*`
  - `mobile/feature/home/impl/*`
  - `mobile/feature/catalog/impl/ui/CoursesContent.kt`
- **Validation:**
  - `cd backend && python3 -m py_compile app/modules/progress/api/router.py app/modules/progress/domain/services.py app/modules/progress/infra/repository.py` -> **PASS**
  - `cd backend && PYTHONPATH=. pytest tests/test_progress_api_router_branches.py tests/test_progress_service.py` -> **8 passed**
  - `cd mobile && ./gradlew :shared:compileKotlinJvm :feature:profile:api:compileKotlinJvm :feature:profile:impl:compileKotlinJvm :feature:home:impl:compileKotlinJvm :feature:catalog:impl:compileKotlinJvm :feature:player:impl:compileKotlinJvm` -> **PASS**
  - `cd mobile && ./gradlew :core:data:jvmTest --tests "com.digitaledu.core.data.progress.NetworkProgressRepositoryTest"` -> **PASS**
- **Open follow-up:** `POST /progress/lesson/self` is now available, but the current mobile player bundle exposes release screens, not backend lesson IDs. Sending authoritative completion updates from player requires either lesson IDs in the mobile bundle contract or a separate progress mapping endpoint.

### Update: 2026-04-22 (player completion sync wired)

- **Date:** 2026-04-22
- **Task:** Finish the remaining progress migration by wiring player lesson completion back to backend.
- **Decision/Change:**
  - Extended catalog release screen contract with optional `lesson_id` derived from published screen payload.
  - Extended mobile catalog models/network mapping so `CatalogScreen` now carries `lessonId`.
  - Added `ResolveCompletedLessonIdUseCase` in player domain to detect when a lesson should be marked completed:
    - when user moves forward from the last screen of one lesson to a screen of another lesson;
    - when user closes the player while staying on the final screen of the bundle.
  - Injected `ProgressRepository` into `PlayerViewModel` and now call `upsertLessonProgress(..., status = "completed")` for those transitions.
- **Why:** Until `lesson_id` was present in the mobile bundle contract, player could only track local screen progress. With lesson identity available, we can now report lesson-level completion to backend without inventing fragile client-side mapping.
- **Files touched:**
  - `backend/app/modules/catalog/api/schemas.py`
  - `backend/app/modules/catalog/api/router.py`
  - `mobile/core/model/src/commonMain/kotlin/com/digitaledu/core/model/catalog/CatalogScreen.kt`
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/ktor/ScreenResponse.kt`
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/ktor/KtorCatalogNetworkDataSource.kt`
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/domain/ResolveCompletedLessonIdUseCase.kt`
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/presentation/PlayerViewModel.kt`
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/di/PlayerFeatureModule.kt`
  - `mobile/feature/catalog/api/src/jvmTest/kotlin/com/digitaledu/feature/catalog/api/CatalogContractsTest.kt`
  - `mobile/feature/player/impl/src/jvmTest/kotlin/com/digitaledu/feature/player/impl/domain/PlayerDomainUseCasesTest.kt`
- **Validation:**
  - `cd mobile && ./gradlew :feature:catalog:api:jvmTest --tests "com.digitaledu.feature.catalog.api.CatalogContractsTest" :feature:player:impl:jvmTest --tests "com.digitaledu.feature.player.impl.domain.PlayerDomainUseCasesTest"` -> **PASS**
  - `cd mobile && ./gradlew :shared:compileKotlinJvm :feature:catalog:impl:compileKotlinJvm :feature:home:impl:compileKotlinJvm :feature:player:impl:compileKotlinJvm` -> **PASS**
  - `cd backend && python3 -m py_compile app/modules/catalog/api/router.py app/modules/catalog/api/schemas.py app/modules/progress/api/router.py` -> **PASS**

## Entry: 2026-04-21 (run script Docker runtime auto-start hardening)

- **Date:** 2026-04-21
- **Task:** Fix `./run` local startup flow so it can start the correct Docker runtime instead of assuming Docker Desktop only.
- **Decision/Change:**
  - Hardened `scripts/ensure-docker.sh` to detect the active Docker context before startup.
  - Added runtime-aware auto-start behavior:
    - `colima*` context -> `colima start`
    - `orbstack*` context -> `open -a OrbStack`
    - Docker Desktop fallback only when the app is actually installed.
  - Added Colima self-heal retry path for stale local VM state:
    - if initial `colima start` fails, script now runs `colima stop --force` once and retries `colima start`.
  - Changed failure handling to surface real runtime startup errors immediately instead of silently swallowing them and waiting the full timeout.
  - Added regression coverage in `backend/tests/test_ensure_docker_script.py` for:
    - successful Colima startup for `docker context = colima`;
    - fail-fast error surfacing when Colima startup still fails;
    - one-shot Colima recovery via forced stop + retry.
- **Why:** Local startup was broken on machines using Colima because `./run` always tried `open -a Docker`, while Docker Desktop was not installed and the active Docker context was `colima`.
- **Validation:**
  - `cd backend && PYTHONPATH=. pytest tests/test_ensure_docker_script.py` -> **3 passed**.
- `./scripts/ensure-docker.sh` -> verified real runtime detection and Colima recovery output.
- `./run` -> passed Docker stage, started postgres/backend/web, printed startup summary, and served health checks on `127.0.0.1:8000` and `127.0.0.1:3000`.

## Entry: 2026-04-22 (mobile: remove fake covers, add profile repository)

- **Date:** 2026-04-22
- **Task:** Start incremental migration of mobile app from fake data to backend-driven state without breaking current catalog/player/auth flow.
- **Decision/Change:**
  - Added `ProfileRepository` + `NetworkProfileRepository` in `mobile/core/data` to stop fetching current user directly from `HomeRoute`.
  - Registered `ProfileRepository` in shared DI and injected it into `ProfileViewModel`.
  - Extended `ProfileUiState` with backend-driven user fields: `displayName`, `role`, `accountStatus`, `permissions`.
  - Updated `ProfileViewModel` to load current profile on init and clear profile data on logout.
  - Removed fake remote cover fallbacks from catalog cards and player course previews.
  - Added pure resolvers for real cover handling:
    - catalog: trim backend `coverUrl` or return `null`
    - player: prefer simulation image, fallback to backend course cover, otherwise `null`
  - Updated home flow to use `profileUiState.displayName` instead of direct `auth/me` call inside `HomeRoute`.
  - Updated profile header to show backend `displayName/role/status` when available.
- **Why:** We need to replace misleading hardcoded mobile data gradually, starting from places where backend contracts already exist and keeping the app working after each step.
- **Files touched:**
  - `mobile/core/data/src/commonMain/kotlin/com/digitaledu/core/data/profile/*`
  - `mobile/shared/src/commonMain/kotlin/com/digitaledu/shared/di/AppModule.kt`
  - `mobile/feature/home/impl/*`
  - `mobile/feature/profile/api/ProfileUiState.kt`
  - `mobile/feature/profile/impl/*`
  - `mobile/feature/catalog/impl/ui/CoursesContent.kt`
  - `mobile/feature/catalog/impl/ui/CourseCoverResolver.kt`
  - `mobile/feature/player/impl/ui/LessonContent.kt`
  - `mobile/feature/player/impl/ui/CoursePreviewCoverResolver.kt`
  - targeted JVM tests for new repositories/resolvers
- **Validation:**
  - `cd mobile && ./gradlew :core:data:jvmTest --tests "com.digitaledu.core.data.profile.NetworkProfileRepositoryTest" :feature:catalog:impl:jvmTest --tests "com.digitaledu.feature.catalog.impl.ui.CourseCoverResolverTest" :feature:player:impl:jvmTest --tests "com.digitaledu.feature.player.impl.ui.CoursePreviewCoverResolverTest"` -> **PASS**
  - `cd mobile && ./gradlew :shared:compileKotlinJvm :feature:home:impl:compileKotlinJvm :feature:profile:impl:compileKotlinJvm :feature:catalog:impl:compileKotlinJvm :feature:player:impl:compileKotlinJvm` -> **PASS**
  - `cd mobile && ./gradlew build` -> **FAIL**, blocked by unrelated pre-existing compile error in `feature/auth/impl/src/commonMain/kotlin/com/digitaledu/feature/auth/impl/AuthScreen.kt` (`Unresolved reference 'format'`).
- **Next step:** Remove fake profile metrics/cards and then add backend student progress API so catalog/profile progress can stop using local pseudo-state.

## Entry: 2026-04-21 (mobile debug quick-login panel for auth)

- **Date:** 2026-04-21
- **Task:** Add mobile-only debug panel for fast authentication to speed up validation of downstream screens.
- **Decision/Change:**
  - Added new shared model contract for debug presets:
    - `mobile/core/model/src/commonMain/kotlin/com/digitaledu/core/model/auth/DebugQuickLoginPreset.kt`
  - Added auth debug config holder in auth impl:
    - `mobile/feature/auth/impl/src/commonMain/kotlin/com/digitaledu/feature/auth/impl/DebugQuickLoginConfig.kt`
  - Extended DI wiring in app module:
    - `createMobileAppModule(...)` now accepts `enableDebugQuickLogin` and `debugQuickLoginPresets`.
    - Registers `DebugQuickLoginConfig` singleton for `AuthViewModel`.
  - Extended auth state/intents/viewmodel:
    - `AuthUiState` now carries `debugQuickLoginConfig`.
    - `AuthIntent` now has `DebugQuickLoginClicked(preset)`.
    - `AuthViewModel` now supports quick-login path via same `authRepository.login(...)` flow and emits existing `AuthEffect.Authenticated`.
  - Updated `LoginScreen`:
    - Added a compact `DebugQuickLoginPanel` rendered only when debug config is enabled and presets are present.
    - Preset buttons trigger quick login through existing intent/effect chain.
  - Android debug wiring in `MainActivity`:
    - Passes `BuildConfig.DEBUG` to DI for `enableDebugQuickLogin`.
    - Injects two seeded demo presets (`mobile_demo_method`, `mobile_demo_admin`) with `mobile12345`.
- **Why:** Developer/test flow needed fast auth to reach next screens repeatedly without manual credential input, while preserving architecture boundaries and keeping release builds clean.
- **Validation:**
  - `cd mobile && ./gradlew :feature:auth:impl:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
  - `cd mobile && ./gradlew :shared:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
  - `cd mobile && ./gradlew :androidApp:assembleDebug` -> **BUILD SUCCESSFUL**.
- **Important Constraint:** Debug quick-login UI is gated by `BuildConfig.DEBUG` through DI, so release builds do not expose the panel.

### Update: 2026-04-21 (debug quick-login panel hidden temporarily)

- **Date:** 2026-04-21
- **Task:** Hide the new mobile debug quick-login panel for now while keeping the implementation available in code.
- **Decision/Change:**
  - In `mobile/androidApp/src/main/kotlin/com/digitaledu/mobile/MainActivity.kt`, changed DI wiring from `enableDebugQuickLogin = BuildConfig.DEBUG` to `enableDebugQuickLogin = false`.
  - Presets and UI implementation remain in place for future re-enable without re-implementing the flow.
- **Why:** User requested to keep the work committed but not exposed in the app UI for now.
- **Validation:**
  - `cd mobile && ./gradlew :androidApp:assembleDebug` -> **BUILD SUCCESSFUL**.

## Entry: 2026-04-20 (global mobile accessibility final auth polish)

- **Date:** 2026-04-20
- **Task:** Close remaining auth-related accessibility gaps after second pass.
- **Decision/Change:**
  - Added shared accessibility modifiers to final auth controls:
    - `LoginScreen`: forgot-password button, QR login button, registration button.
    - `RegistrationScreen`: sign-in/back button.
    - `PasswordRecoveryScreen`: back-to-login row.
    - `QrScannerViewport.android.kt`: camera permission CTA.
- **Why:** After broader accessibility rollout, a few auth actions still used raw controls without explicit accessibility semantics/touch-target wrapping.
- **Validation:**
  - `cd mobile && ./gradlew :feature:auth:impl:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
  - `cd mobile && ./gradlew :feature:profile:impl:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
- **Result:** Core mobile auth/home/catalog/player/profile flows now have shared accessibility semantics and enlarged touch-target coverage on primary interactive elements.
- **Final micro-pass:** Rechecked auth controls and confirmed final accessibility wrapping on forgot-password, QR login, registration, back-to-login, and camera-permission CTA before closing the task.

## Entry: 2026-04-20 (global mobile accessibility second pass)

- **Date:** 2026-04-20
- **Task:** Extend accessibility coverage to remaining interactive controls after first global pass.
- **Decision/Change:**
  - Added `accessibilityTouchTarget` + `accessibilitySemantics` usage in additional modules/components:
    - `mobile/feature/profile/impl/.../ProfileContent.kt`
    - `mobile/feature/auth/impl/.../AuthScreen.kt`
    - `mobile/feature/auth/impl/.../QrLoginScreen.kt`
    - `mobile/feature/player/impl/.../player/components/QuizStory.kt`
    - `mobile/feature/player/impl/.../player/components/LessonCheatSheetView.kt`
    - `mobile/feature/player/impl/.../player/components/LessonStoriesPager.kt`
  - Covered previously unwrapped controls: profile logout/dismiss/back actions, auth accessibility back action, QR manual login CTA, quiz navigation buttons/options, code-copy action, theory/close fullscreen controls.
- **Why:** First pass covered high-traffic screens, but some secondary interactive controls still used raw click handling without the shared accessibility helper layer.
- **Validation:**
  - `cd mobile && ./gradlew :feature:profile:impl:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
  - `cd mobile && ./gradlew :feature:auth:impl:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
- **Known follow-up:**
  - Remaining accessibility polish is mostly content-specific (localized labels for every dynamic action and richer narration text), not architecture/runtime wiring.

## Entry: 2026-04-20 (global mobile accessibility behavior expanded)

- **Date:** 2026-04-20
- **Task:** Make mobile accessibility settings affect shared interactive behavior across the app instead of only theme/profile/auth settings screens.
- **Decision/Change:**
  - Added shared accessibility UI layer in `mobile/core/ui/src/commonMain/kotlin/com/digitaledu/core/ui/components/UiTokens.kt`:
    - `AccessibilityUiState`
    - `LocalAccessibilityUiState`
    - `ProvideAccessibilityUiState(...)`
    - `Modifier.accessibilityTouchTarget`
    - `Modifier.accessibilitySemantics(...)`
  - Wired `DigitalEduApp` to provide `voiceSupport` and `tremorFilter` globally from persisted settings.
  - Applied shared accessibility modifiers to high-frequency interactive elements in:
    - `mobile/core/ui/.../AuthComponents.kt`
    - `mobile/feature/home/impl/.../HomeScreen.kt`
    - `mobile/feature/catalog/impl/.../CoursesContent.kt`
    - `mobile/feature/player/impl/.../LessonContent.kt`
    - `mobile/feature/player/impl/.../ui/player/SimulationScreen.kt`
  - Resulting behavior:
    - tremor filter now enlarges touch targets through a shared modifier for major buttons/cards/tabs/chips/hotspots;
    - voice support now adds merged semantic labels/roles to major interactive surfaces so screen readers announce clearer actions.
- **Why:** `largeText` and `highContrast` already affected theme, but `voiceSupport` and `tremorFilter` were mostly stored-only flags with limited real impact outside profile/auth settings.
- **Validation:**
  - `cd mobile && ./gradlew :core:ui:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
  - `cd mobile && ./gradlew :feature:auth:impl:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
  - `cd mobile && ./gradlew :feature:home:impl:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
  - `cd mobile && ./gradlew :feature:catalog:impl:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
- **Known follow-up:**
  - Some deep/secondary screens still use raw `clickable` or default semantics and can be migrated onto the same helpers in a later pass.
  - `voiceSupport` currently improves semantics/announcements; it is not a full text-to-speech narration engine.

## Entry: 2026-04-20 (auth onboarding accessibility route fixed)

- **Date:** 2026-04-20
- **Task:** Fix mobile flow where tapping "Настройка доступности" during sign-in redirected to login instead of opening accessibility settings.
- **Decision/Change:**
  - `mobile/feature/auth/impl/src/commonMain/kotlin/com/digitaledu/feature/auth/impl/AuthScreen.kt`
    - replaced onboarding handler `onOpenAccessibility` from `ROUTE_LOGIN` to a dedicated `ROUTE_ACCESSIBILITY`.
    - added `auth/accessibility` destination with functional toggles (large text, high contrast, voice support, tremor filter).
    - connected screen to shared `AccessibilityPreferencesRepository` state via `collectAsStateWithLifecycle`.
  - `mobile/feature/auth/impl/src/commonMain/kotlin/com/digitaledu/feature/auth/impl/AuthViewModel.kt`
    - added `updateAccessibility(...)` API that persists settings through repository in `viewModelScope`.
  - `mobile/feature/auth/impl/src/commonMain/kotlin/com/digitaledu/feature/auth/impl/AuthFeatureModule.kt`
    - injected `AccessibilityPreferencesRepository` into `AuthViewModel`.
- **Why:** Accessibility settings had a dead-end navigation on onboarding, and users were forced back to login flow instead of seeing real accessibility controls before authentication.
- **Validation:**
  - `cd mobile && ./gradlew :feature:auth:impl:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
  - `cd mobile && ./gradlew :feature:profile:impl:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
  - `cd mobile && ./gradlew :feature:home:impl:compileKotlinJvm` -> **BUILD SUCCESSFUL**.
- **Assumption:** Reusing profile module UI directly from auth module is not allowed by module boundaries; therefore, accessibility UI for auth flow is implemented locally but writes to the same shared repository.

## Entry: 2026-04-20 (mobile startup bootstrap moved off critical path)

- **Date:** 2026-04-20
- **Task:** Investigate Android startup ANR risk and reduce blocking work on app launch.
- **Decision/Change:**
  - `mobile/androidApp/src/main/kotlin/com/digitaledu/mobile/MainActivity.kt`
    - removed synchronous Koin bootstrap from the immediate `onCreate` critical path;
    - added a temporary loading indicator UI before shared app composition;
    - moved DI/bootstrap work into `lifecycleScope.launch { withContext(Dispatchers.Default) { ... } }` so secure storage/DataStore/Koin setup does not block first frame on slower devices.
- **Why:** Startup investigation showed no reproducible current ANR, but `MainActivity` was still doing Android-specific DI and secure session store creation before first composition. That is a high-risk pattern for startup freezes on slower devices and was worth hardening proactively.
- **Validation:**
  - `cd mobile && ./gradlew :androidApp:assembleDebug` -> **BUILD SUCCESSFUL**.
  - Reinstalled debug APK on emulator and ran repeated cold starts:
    - start 1 wait time ~861 ms
    - start 2 total time ~1280 ms
    - start 3 total time ~1159 ms
  - `adb logcat` after repeated starts -> no new `ANR in`, `am_anr`, `Input dispatching timed out`, or `FATAL EXCEPTION` entries for `com.digitaledu.mobile`.
- **Known follow-up:**
  - Historical files remain in `/data/anr` on the emulator, but current runtime signals do not reproduce an app ANR.
  - If ANR still appears on a specific physical device, capture device-specific logcat during startup and compare keystore/DataStore timing.

## Entry: 2026-04-20 (mobile accessibility settings made functional)

- **Date:** 2026-04-20
- **Task:** Make mobile accessibility settings in profile actually work app-wide instead of being local UI-only toggles.
- **Decision/Change:**
  - Added shared accessibility model + preferences contract:
    - `mobile/core/model/.../AccessibilitySettings.kt`
    - `mobile/core/data/.../AccessibilityPreferencesRepository.kt`
    - `mobile/core/data/.../InMemoryAccessibilityPreferencesRepository.kt`
  - Added Android persistence in `androidApp` using DataStore:
    - `mobile/androidApp/.../AndroidAccessibilityPreferencesRepository.kt`
    - wired via `provideAccessibilityPreferencesRepository(...)`
  - Extended app DI and shared host wiring:
    - `createMobileAppModule(...)` now accepts optional `accessibilityPreferencesRepository`
    - registered `AccessibilitySettingsHost` / `AccessibilitySettingsHostImpl`
    - fallback in-memory repo remains for non-Android targets.
  - Connected settings to global app theme and scaling:
    - `DigitalEduApp` now reads `AccessibilitySettingsHost.settings`
    - `DigitalEduTheme` now accepts `highContrast` and `largeText`
    - font scaling is applied via `LocalDensity` override.
  - Implemented high-contrast color behavior:
    - added `ProsvetHighContrastColorScheme`
    - added `ColorScheme.toHighContrastScheme()` utility for dynamic-color case.
  - Reworked profile accessibility screen from local remember-state to real intents + repository updates:
    - new intents in `ProfileIntent` (`SetLargeText`, `SetHighContrast`, `SetVoiceSupport`, `SetTremorFilter`)
    - `ProfileUiState` now carries persisted `accessibilitySettings`
    - `ProfileViewModel` now observes repository flow and updates settings via repository
    - profile settings rows now display active accessibility state summary and use voice/tremor behavior hints.
  - Updated profile API module dependencies and contracts tests accordingly.
- **Why:** Existing toggles in profile accessibility screen were UI-local (`rememberSaveable`) and reset when leaving screen; they had no effect on app theme/text rendering.
- **Validation:**
  - `cd mobile && ./gradlew :androidApp:assembleDebug` -> **BUILD SUCCESSFUL**.
- **Known follow-up:**
  - `voiceSupport` and `tremorFilter` are now persisted and partially applied in profile UI semantics/touch affordance; broader cross-screen behavior can be expanded in a dedicated pass.

## Entry: 2026-04-09 (local schema-health guard for demo/mock seed flows)

- **Date:** 2026-04-09
- **Task:** Prevent local DBs that are stamped to Alembic head but missing core tables from breaking mock/demo seed flows.
- **Planned Change:**
  - Add a shared backend schema-health helper for required public tables.
  - Add a local-dev-only repair helper that backs up, drops/recreates `public`, and reapplies migrations.
  - Wire `doctor` and the backend demo/mock seed entrypoints to fail fast on unhealthy schema.
- **Validation Plan:**
  - Add pytest coverage for broken-schema detection, repair guardrails, and seed-flow preflight failures.
  - Verify with `make doctor`, demo seed targets, and the repair target on loopback-only local Postgres.

### Update: 2026-04-09 (schema-health guard shipped)

- **Date:** 2026-04-09
- **Task:** Ship permanent local schema-health prevention for backend demo/mock seed flows.
- **Decision/Change:**
  - Added shared backend schema preflight in `backend/scripts/db_schema_health.py` that checks real required `public` tables instead of relying on Alembic version state.
  - Added guarded local repair helper `backend/scripts/repair_local_db_schema.py` for loopback DB URLs only, with explicit `ALLOW_LOCAL_SCHEMA_REPAIR=1`, backup, `public` schema rebuild, `alembic upgrade head`, and post-repair health verification.
  - Wired `scripts/doctor.py`, demo/mock seed CLIs, and new Make targets `db-schema-health` / `db-schema-repair-local` so broken stamped schemas fail fast with one actionable message instead of partially seeding or silently skipping work.
- **Why:** Local Postgres could report Alembic head while missing core tables like `users` and `groups`, which made seed flows fail unpredictably or succeed partially.
- **Files touched:** `backend/scripts/db_schema_health.py`, `backend/scripts/repair_local_db_schema.py`, `scripts/doctor.py`, `Makefile`, `backend/scripts/course_builder_mocks.py`, `backend/scripts/digital_literacy_demo_seed.py`, `backend/scripts/mobile_runtime_demo_seed.py`, `backend/scripts/progress_mocks.py`, backend tests for schema health/seed guard/repair guard.
- **Next step:** Use `make db-schema-health` before local demo seeding and reserve `ALLOW_LOCAL_SCHEMA_REPAIR=1 make db-schema-repair-local` for explicit loopback repair only.

## Entry: 2026-04-08 (DB backup policy before destructive operations)

- **Date:** 2026-04-08
- **Task:** Настроить политику автоматического backup перед деструктивными DB-операциями.
- **Decision/Change:**
  - Добавлен единый скрипт бэкапа: `scripts/db-backup.sh`.
    - Поддерживает `--reason`, `--db-url`, `--out-dir`, `--container`.
    - По умолчанию сохраняет архивы в `.backups/db/`.
    - Формат: `YYYYMMDD-HHMMSS_<reason>.sql.gz`.
  - Интегрировано в `run`:
    - перед `DROP SCHEMA public` (auto-fix flow) теперь выполняется preflight backup.
    - добавлены env-переключатели:
      - `DB_BACKUP_BEFORE_DESTRUCTIVE` (default `1`)
      - `DB_BACKUP_DIR` (default `.backups/db`).
  - Интегрировано в `Makefile` reset-цели:
    - `builder-mocks-reset`
    - `progress-mocks-reset`
    - `literacy-demo-reset`
    - `literacy-demo-realistic-reset`
    - `mobile-runtime-reset`
    - `mobile-runtime-heavy-reset`
    - перед reset выполняется `bash ./scripts/db-backup.sh ...`.
  - В `.gitignore` добавлено исключение `.backups/`.
- **Validation:**
  - `bash -n scripts/db-backup.sh && bash -n run` -> passed.
  - `bash scripts/db-backup.sh --reason policy-check --db-url postgresql+psycopg://app:app@127.0.0.1:5432/app` -> backup успешно создан.

### Update: 2026-04-08 (backup retention + manual trigger target)

- **Date:** 2026-04-08
- **Task:** Добавить ротацию backup-файлов и ручную команду для явного снимка БД.
- **Decision/Change:**
  - `scripts/db-backup.sh` расширен:
    - новый параметр `--retain-count` и env `DB_BACKUP_RETAIN_COUNT` (default `3`).
    - после создания нового бэкапа автоматически удаляются старые архивы сверх лимита.
  - `Makefile` расширен:
    - новый target `db-backup` для ручного запуска.
    - reason для ручного запуска задаётся через `BACKUP_REASON` (default `manual-make-db-backup`).
- **Validation:**
  - `bash -n scripts/db-backup.sh` -> passed.
  - `make -n db-backup` -> корректная команда сформирована.
  - `DB_BACKUP_RETAIN_COUNT=2 BACKUP_REASON=manual-policy-check-2 make db-backup` -> backup создан + retention сработал.

### Update: 2026-04-08 (backup restore workflow)

- **Date:** 2026-04-08
- **Task:** Добавить восстановление базы из `.backups/db` без ручных docker/psql команд.
- **Decision/Change:**
  - Добавлен скрипт `scripts/db-restore.sh`:
    - restore из `--file` или `--latest`;
    - обязательное подтверждение `--confirm YES_I_UNDERSTAND_DATA_LOSS`;
    - safety snapshot перед restore (`pre-restore-safety`);
    - reset `public` schema и загрузка SQL из `.sql.gz`.
  - Makefile расширен:
    - `make db-backup-list` — показать доступные snapshots.
    - `make db-restore` — restore latest или `BACKUP_FILE=...`.
    - для restore обязателен `RESTORE_CONFIRM=YES_I_UNDERSTAND_DATA_LOSS`.
- **Validation:**
  - `bash -n scripts/db-restore.sh` -> passed.
  - `make -n db-restore` -> guard и команда restore сформированы.
  - `make db-backup-list` -> snapshots отображаются.

### Update: 2026-04-08 (real dashboard period filtering for progress)

- **Date:** 2026-04-08
- **Task:** Включить реальный периодный фильтр (в т.ч. 7 дней) для dashboard-прогресса end-to-end.
- **Decision/Change:**
  - Backend progress API расширен периодным контрактом:
    - `period`: `all | 7d | 14d | 30d | 90d | custom`
    - `date_from` / `date_to` (обязательны для `custom`).
  - `backend/app/modules/progress/api/router.py`:
    - новые query-параметры проброшены в service;
    - добавлен маппинг `ProgressError -> HTTPException` для `GET /progress/overview`.
  - `backend/app/modules/progress/domain/services.py`:
    - вычисление time-window по period;
    - валидация custom-диапазона (`date_from <= date_to`, оба поля обязательны).
  - `backend/app/modules/progress/infra/repository.py`:
    - фильтрация completed-уроков по `lesson_progress.completed_at` в указанном окне.
  - Web wiring:
    - `web/src/features/progress/api.ts` отправляет `period/date_from/date_to` в backend.
    - `web/app/dashboard/page.tsx`:
      - SSR period selector через `searchParams` (default `7d`),
      - все dashboard-ссылки сохраняют текущий `period`,
      - метрики/график запрашиваются с выбранным `period`.
  - Dashboard UI:
    - добавлены period-pill controls и active state;
    - обновлены стили в `web/app/dashboard/dashboard.module.css`.
- **Validation:**
  - `cd backend && PYTHONPATH=. python3 -m pytest tests/test_progress_api_router_branches.py tests/test_progress_service.py` -> 6 passed.
  - `cd backend && python3 -m ruff check app/modules/progress tests/test_progress_api_router_branches.py tests/test_progress_service.py` -> passed.
  - `cd web && npm run lint` -> passed (existing unrelated warnings only).
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-08 (global search rollout: backend permissions + web UX wiring)

- **Date:** 2026-04-08
- **Task:** Продолжить Sprint 1 по global search и закрыть найденные контрактные/UX пробелы.
- **Decision/Change:**
  - Backend search contract hardening:
    - `backend/app/modules/search/api/router.py`
      - endpoint оставлен на `GET /api/v1/search` (без двойного `/search/search`),
      - доступ переведён на `require_policy("search.view")`,
      - параметр `types` теперь поддерживает и повторяющиеся query-параметры, и comma-separated формат.
    - `backend/app/modules/search/api/schemas.py`
      - добавлено поле `next_cursor` в `SearchResponse` (текущее значение `null`, курсорный режим пока не включён).
    - `backend/app/modules/search/domain/service.py`
      - явное заполнение `next_cursor=None`.
  - Permission consistency for search:
    - `backend/app/shared/auth/policies.py` добавлена политика `search.view` (administrator/methodologist/moderator/assistant).
    - `backend/app/modules/auth/domain/permissions.py` шаблоны ролей синхронизированы с search policy;
      также добавлен недостающий шаблон прав для роли `assistant`.
  - Web global search usability:
    - `web/app/search/page.tsx`
      - фильтр типа (`all/course/user/group`) синхронизирован с URL-параметром `type`,
      - запрос к backend теперь выполняется с серверной фильтрацией `types`, а не только клиентским post-filter,
      - очищение состояния поиска при пустом запросе.
    - `web/src/features/search/components/search-results.tsx`
      - активная кнопка фильтра теперь визуально выделяется (`styles.active`) и имеет `aria-pressed`.
    - `web/app/api/admin/search/route.ts`
      - при пустом `q` возвращается корректный пустой ответ без лишнего backend-вызова.
    - `web/app/dashboard/page.tsx`
      - добавлен tile `Глобальный поиск` (`/search?lang=...`) с permission gate `search.view`.
- **Validation:**
  - `cd backend && python3 -m ruff check app/modules/search app/shared/auth/policies.py app/modules/auth/domain/permissions.py` -> passed.
  - `cd backend && PYTHONPATH=. python3 -m pytest tests/test_search.py` -> 18 passed.
  - `cd backend && PYTHONPATH=. python3 -m pytest tests/test_api_rbac_contract.py` -> 19 passed.
  - `cd web && npm run lint` -> passed (existing unrelated warnings only, no new errors).
  - `cd web && npm run type-check` -> passed.

### Update: 2026-04-08 (E2E smoke path scaffold: auth -> dashboard -> search)

- Добавлен новый smoke-скрипт:
  - `web/scripts/test-auth-dashboard-search.cjs`
  - покрывает путь: login (`/auth`) -> dashboard tile (`/search?lang=ru`) -> query sync (`q`) -> type filter sync (`type=user`) + `aria-pressed`.
- Добавлен npm script:
  - `web/package.json`: `test:auth-dashboard-search`.
- Validation status:
  - `cd web && npm run lint` -> passed (только ранее существующие warnings вне зоны изменений).
  - После запуска `colima` и recovery старта стека (`AUTO_FIX_BROKEN_DB_SCHEMA=1 ALLOW_DB_SCHEMA_RESET=1 CONFIRM_DB_RESET=YES_I_UNDERSTAND_DATA_LOSS make run-bg`) smoke пройден:
    - `cd web && npm run test:auth-dashboard-search` -> passed.
  - `make status` -> backend/web HTTP 200.
- Runtime follow-up fix:
  - `backend/migrations/versions/0020_add_admin_audit_logs.py` сделана устойчивой к локально рассинхронизированной схеме (условное добавление FK на `users` только при наличии таблицы), чтобы локальный запуск не падал до восстановления схемы.

## Entry: 2026-04-08 (admin audit logs for RBAC and user management)

- **Date:** 2026-04-08
- **Task:** Продолжить Sprint 1 и закрыть задел по audit logs для админских действий.
- **Decision/Change:**
  - Добавлено персистентное хранилище audit-событий:
    - `backend/app/shared/security/models.py` (`admin_audit_logs` model)
    - `backend/app/shared/security/repository.py` (`AdminAuditLogRepository`)
    - миграция `backend/migrations/versions/0020_add_admin_audit_logs.py`.
  - Интегрирован аудит в RBAC API:
    - логируются операции `rbac.policy.matrix.update`, `rbac.policy.rule.toggle`,
      `rbac.policy.bulk_update`, `rbac.policy.rule.create`, `rbac.policy.rule.delete`.
    - добавлен endpoint `GET /api/v1/rbac/audit-logs` (только `rbac.manage`).
  - Интегрирован аудит в user management:
    - `UsersService.update_user(...)` пишет событие `users.user.update` с диффом изменённых полей (`display_name`, `role`, `status`).
  - Добавлены тесты `backend/tests/test_admin_audit_logs.py`:
    - проверка аудита при обновлении пользователя;
    - проверка аудита при создании RBAC policy rule.
- **Validation:**
  - `cd backend && PYTHONPATH=. python3 -m pytest tests/test_admin_audit_logs.py` -> 2 passed.
  - `cd backend && PYTHONPATH=. python3 -m pytest tests/test_api_rbac_contract.py` -> 19 passed.
  - `cd backend && python3 -m ruff check app tests migrations/versions/0020_add_admin_audit_logs.py` -> passed.

## Entry: 2026-04-07 (OpenCode + MemPalace local automation)

- **Date:** 2026-04-07
- **Task:** Настроить автоматическую локальную работу MemPalace именно для OpenCode (без Claude hooks).
- **Decision/Change:**
  - Удалены ранее добавленные Claude-specific hook-файлы:
    - `.claude/settings.local.json`
    - `.claude/hooks/mempalace_autosave.sh`
    - `.claude/hooks/mempalace_precompact.sh`
  - Добавлен проектный OpenCode config `opencode.json` с локальным MCP-сервером `mempalace`:
    - команда: `python3 -m mempalace.mcp_server`.
  - Добавлен локальный OpenCode plugin `.opencode/plugins/mempalace-auto.ts`:
    - автозапуск `mempalace --palace .mempalace mine .` на событиях `session.idle` и `session.compacted`;
    - встроен fallback на `python3 -m mempalace.cli`;
    - добавлен debounce 3 минуты, чтобы не запускать индексацию слишком часто;
    - в compaction добавляется контекстная подсказка сохранять решения/блокеры в MemPalace.
  - Добавлена локальная команда OpenCode `.opencode/commands/memory.md` для быстрого восстановления контекста через `wake-up`.
  - Обновлён `.gitignore` для локальной OpenCode конфигурации:
    - `.opencode/`
    - `opencode.json`
- **Validation:**
  - `python3 -c "import json, pathlib; json.loads(pathlib.Path('opencode.json').read_text())"` -> успешно.
  - `python3 -m mempalace.cli --palace .mempalace status` -> успешно, индекс доступен (`MemPalace Status — 1871 drawers`).
  - `opencode debug config` -> ошибка из существующего глобального плагина (`opencode-mem`, `fn3 is not a function`), не из проектных файлов; см. лог: `~/.local/share/opencode/log/2026-04-07T092400.log`.

### Update: 2026-04-07 (global OpenCode plugin conflict workaround)

- Для восстановления работоспособности `opencode debug config` отключены два конфликтующих глобальных плагина в `~/.config/opencode/opencode.json`:
  - `opencode-mem`
  - `@tarquinen/opencode-dcp`
- Повторная проверка: `opencode debug config` отрабатывает успешно и выводит итоговый merged config, включая проектный `mempalace` MCP и локальный plugin `file://.../.opencode/plugins/mempalace-auto.ts`.

## Entry: 2026-04-06 (mobile catalog empty-state investigation)

- **Date:** 2026-04-06
- **Task:** Trace every runtime path that can leave the mobile catalog/home UI empty after backend seeding and relogin.
- **Findings:**
  - `NetworkCatalogRepository.listCourses()` hard-wires `includeDrafts=false` and `includeArchived=false`, so seeded draft/archived courses are silently filtered out before they ever reach UI.
  - `CatalogViewModel` only refreshes once in `init { processIntent(CatalogIntent.RefreshCourses) }`; the host is wired through `single<HomeFeatureEntry>` + `factory<CatalogFeatureHost>`, so the same catalog state can survive relogin unless something explicitly refreshes it.
  - Both `CoursesContent` and `HomeCoursesContent` render an empty-state branch whenever `courses.isEmpty()` and loading is not the special initial-loading case.
- **Next fix direction:** refresh on home/session re-entry or app auth change, and validate backend seed status against the client’s default filters.

## Entry: 2026-04-06 (backend: mobile runtime demo seed tooling)

### Update: 2026-04-06 (catalog visibility for any authenticated user)

- Убрана ролевaя author-фильтрация в `GET /api/v1/catalog/courses` для `METHODOLOGIST`:
  - файл: `backend/app/modules/catalog/api/router.py`
  - теперь endpoint возвращает общий список опубликованных/активных курсов по флагам запроса, независимо от роли пользователя.
- Добавлена миграция `backend/migrations/versions/0019_add_catalog_read_for_user.py`:
  - upsert правила RBAC `catalog.read -> user (enabled=true)` на уровне БД,
  - чтобы доступ для обычного пользователя не зависел от ручной настройки `rbac_policy_rules`.
- Validation:
  - `cd backend && python3 -m alembic upgrade head` -> успешно (применена `0019_add_catalog_read_for_user`);
  - `make mobile-runtime-heavy-seed` -> успешно;
  - `make mobile-runtime-heavy-verify` -> успешно (`/catalog/courses`: 6);
  - API smoke через `TestClient`:
    - `mobile_demo_user`, `mobile_demo_method`, `mobile_demo_admin` видят по 6 курсов;
    - новый только что зарегистрированный `USER` также видит 6 курсов.

- **Date:** 2026-04-06
- **Task:** Замокать данные на backend и сделать повторяемый скрипт, чтобы mobile отображал «реальные» данные через API.
- **Decision/Change:**
  - Добавлен новый скрипт `backend/scripts/mobile_runtime_demo_seed.py` с командами:
    - `seed` — создаёт/обновляет demo-пользователей (`mobile_demo_method`, `mobile_demo_admin`), переиспользует каталог из `catalog_mock_data.py`, назначает автора курсов;
    - `cleanup` — удаляет seeded catalog-данные и demo-пользователей;
    - `reset` — cleanup + seed;
    - `verify` — e2e-проверка API-потока `login -> /auth/me -> /catalog/courses -> /catalog/courses/{slug}/releases/latest` через `TestClient`.
  - Для максимальной полноты данных в mobile под ролью методиста авторство целевых курсов назначается пользователю `mobile_demo_method` (чтобы список курсов не обрезался author-фильтром роли).
  - Обновлён `Makefile` новыми целями:
    - `mobile-runtime-seed`
    - `mobile-runtime-clean`
    - `mobile-runtime-reset` (с тем же guard для destructive reset)
    - `mobile-runtime-verify`.
  - Обновлён `backend/README.md` разделом **Mobile Runtime Demo Data** с командами и дефолтными кредами.
- **Validation:**
  - `make mobile-runtime-seed` -> успешно.
  - `make mobile-runtime-verify` -> успешно:
    - login: OK
    - `/auth/me`: OK
    - `/catalog/courses`: 4 course(s)
    - latest release (`gosuslugi-basic`): 4 screen(s).
  - `cd backend && ruff check scripts/mobile_runtime_demo_seed.py` -> `All checks passed!`.

### Update: 2026-04-06 (backend: mobile-heavy profile for richer demos)

- В `backend/scripts/mobile_runtime_demo_seed.py` добавлен профиль `mobile-heavy`:
  - `seed --profile mobile-heavy` дополняет базовый набор двумя реалистичными курсами:
    - `online-pharmacy-orders`
    - `school-parent-chat-safety`
  - Для дополнительных курсов создаются published releases и экраны (`article`/`video`/`simulation`/`quiz`/`cheat_sheet`) с checksum-пересчётом и идемпотентным upsert-поведением.
  - `verify --profile mobile-heavy` проверяет повышенный порог по количеству курсов (минимум по целевым slug профиля).
  - `cleanup` теперь удаляет и heavy-курсы, чтобы reset возвращал базу в чистое состояние.
- Обновлён `Makefile` shortcut-целями:
  - `mobile-runtime-heavy-seed`
  - `mobile-runtime-heavy-reset` (под тем же destructive guard)
  - `mobile-runtime-heavy-verify`.
- Обновлён `backend/README.md` командами для `mobile-heavy` профиля.
- Validation:
  - `cd backend && ruff check scripts/mobile_runtime_demo_seed.py` -> `All checks passed!`.
  - `make mobile-runtime-heavy-seed` -> успешно.
  - `make mobile-runtime-heavy-verify` -> успешно:
    - login: OK
    - `/auth/me`: OK
    - `/catalog/courses`: 6 course(s)
    - latest release (`gosuslugi-basic`): 4 screen(s).

## Entry: 2026-04-06 (mobile: replace Home mocks with backend-driven data)

- **Date:** 2026-04-06
- **Task:** Убрать замоканные значения на Home-экране mobile и подставлять реальные данные с backend/admin.
- **Decision/Change:**
  - `mobile/core/model/src/commonMain/kotlin/com/digitaledu/core/model/auth/AuthMe.kt`
    - Добавлена модель `AuthMe` для ответа `/api/v1/auth/me`.
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/AuthNetworkDataSource.kt`
    - Добавлен контракт `getCurrentUser(accessToken: String): AuthMe`.
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/ktor/KtorAuthNetworkDataSource.kt`
    - Реализован вызов `GET /api/v1/auth/me` с bearer-токеном.
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/ktor/AuthMeResponse.kt`
    - Добавлен DTO + маппинг полей (`user_id`, `display_name`, `permissions`, и т.д.).
  - `mobile/core/data/src/commonMain/kotlin/com/digitaledu/core/data/auth/AuthRepository.kt`
    - Добавлен метод `getCurrentUser()`.
  - `mobile/core/data/src/commonMain/kotlin/com/digitaledu/core/data/auth/NetworkAuthRepository.kt`
    - Реализован `getCurrentUser()` через `withFreshAccessToken`.
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/HomeRoute.kt`
    - Подтягивается реальный `displayName` пользователя через `authRepository.getCurrentUser()`.
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/HomeScreen.kt`
    - Убраны хардкоды Home UI:
      - приветствие теперь динамическое (`Здравствуйте, {displayName}` или дефолт);
      - прогресс continue-card теперь вычисляется из `PlayerUiState` вместо фиксированных `45%` и `Урок 3 из 8`;
      - fallback-title continue-card заменён на нейтральный CTA-ориентированный текст;
      - в recommended-card убраны фиктивные длительности (`15/10/20 мин`), вместо них используется реальное описание курса при наличии.
  - `mobile/feature/home/impl/src/commonMain/composeResources/values/strings.xml`
    - Удалены mock-строки и добавлены форматируемые строки для динамического приветствия и прогресса.
  - DI/Home wiring:
    - `HomeFeatureModule.kt`, `HomeFeatureEntryImpl.kt`, `HomeNavigation.kt` обновлены для прокидывания `AuthRepository` в `HomeRoute`.
  - Тестовые заглушки обновлены под новый auth-контракт:
    - `mobile/core/data/src/jvmTest/.../NetworkAuthRepositoryTest.kt`
    - `mobile/feature/profile/impl/src/jvmTest/.../LogoutUseCaseTest.kt`
- **Validation:**
  - `cd mobile && ./gradlew :core:data:jvmTest --tests com.digitaledu.core.data.auth.NetworkAuthRepositoryTest` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:profile:impl:jvmTest --tests com.digitaledu.feature.profile.impl.domain.LogoutUseCaseTest` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:home:impl:compileKotlinJvm :core:network:compileKotlinJvm :core:data:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew test` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew build` -> failed on pre-existing `:androidApp:lintDebug` issue (`PermissionImpliesUnsupportedChromeOsHardware` in `androidApp/src/main/AndroidManifest.xml`), unrelated to this change-set.

### Update: 2026-04-06 (player learning: removed preview mocks, backend-only)

- В `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/ui/LessonContent.kt` удалён fallback на `buildMockLearningCourses()`.
- Экран Learning теперь рендерит только реальный открытый bundle из backend (`uiState.bundle`); при отсутствии bundle показывается empty-state без синтетических курсов/уроков.
- Удалён helper `mockLesson(...)` и весь hardcoded mock-контент курсов/уроков (`mock-*`, `example.com` payload URLs).
- Логика прогресса/категории/обложки для реального курса сохранена.
- Доп. проверка:
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm :feature:home:impl:compileKotlinJvm :core:data:compileKotlinJvm :core:network:compileKotlinJvm` -> `BUILD SUCCESSFUL`.

## Entry: 2026-04-06 (learning tab mock dataset for full preview)

- **Date:** 2026-04-06
- **Task:** Замокать данные вкладки «Обучение», чтобы можно было просмотреть все состояния экранов без зависимости от живого каталога.
- **Decision/Change:**
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/ui/LessonContent.kt`
    - Добавлена preview-модель `LearningCoursePreview` + категории `LearningCategory`.
    - Реализован builder `buildLearningCoursePreviews(...)`, который:
      - использует активный `uiState.bundle` как playable-курс (если он есть),
      - добавляет расширенный mock-набор курсов/уроков для полноценного визуального просмотра.
    - Экран `LearningCoursesScreen` переведён на рендер списка карточек курсов (вместо одной карточки active bundle), с фильтрацией по chips и поиску.
    - `LearningCourseLessonsScreen` и `LearningLessonDetailsScreen` отвязаны от обязательного `uiState.bundle` и работают от выбранного preview-курса/урока.
    - Для реального bundle сохранена интеграция с MVI (`NavigateToScreen`, `EnterFullscreen`), для mock-курсов включён безопасный режим только визуального просмотра.
- **Validation:**
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileAndroidMain` -> `BUILD SUCCESSFUL`.

## Entry: 2026-04-06 (learning tab visual fixes from QA screenshot)

- **Date:** 2026-04-06
- **Task:** Исправить визуальные дефекты на вкладке «Обучение» по скриншоту QA без изменений `Home`.
- **Decision/Change:**
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/ui/LessonContent.kt`
    - Убрано дублирование заголовка «Обучение» внутри контента вкладки (оставлен единый верхний заголовок экрана).
    - Список category chips переведён с `Row` на `LazyRow` с горизонтальным скроллом.
    - Для label chip добавлены `maxLines = 1` и `TextOverflow.Ellipsis`, чтобы длинные лейблы (например, «Мессенджеры») не ломали вертикальный рендер.
  - Home-экран и другие вкладки не изменялись.
- **Validation:**
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileAndroidMain` -> `BUILD SUCCESSFUL`.

### Update: 2026-04-06 (second visual pass)

- В `LearningCoursesScreen` добавлено поле поиска курсов (иконка + placeholder) в стиле макета.
- Для поля добавлен ресурс: `learning_search_placeholder`.
- Перепроверены компиляции:
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileAndroidMain` -> `BUILD SUCCESSFUL`.

### Update: 2026-04-06 (Learning UI/UX readability + progress consistency)

- Исправлен рендер прогресса в `LearningCourseLessonsScreen`:
  - строка-подпись теперь `learning_course_progress_label` (`Ваш прогресс`),
  - значение прогресса берётся из фактического прогресса курса (`progressIndex`), а не из текущего выбранного урока.
- Улучшена UX-логика для mock-курсов в `LearningLessonDetailsScreen`:
  - CTA «Начать урок» отключается для непроигрываемых preview-курсов,
  - текст CTA меняется на `Только предпросмотр`.
- Поднята читабельность типографики на Learning-экранах:
  - увеличены размеры подписи прогресса и основного прогресс-текста,
  - увеличены размеры текста в строках уроков,
  - увеличен размер текста в stats-карточках и добавлен `TextAlign.Center`.
- Добавлены ресурсы:
  - `learning_preview_only`
  - `learning_course_progress_label`.

### Update: 2026-04-06 (Learning UI/UX typography hierarchy pass 2)

- Во вкладке `Learning` выполнен второй проход по читаемости без изменений `Home`:
  - увеличен размер текста подзаголовка выбора курса;
  - увеличена типографика поиска (введён `textStyle` и увеличен placeholder);
  - увеличен шрифт в category chips;
  - увеличен текст empty-state и описаний карточек курсов;
  - увеличен secondary-текст в строках уроков;
  - увеличена типографика блока «Вы научитесь» и его пунктов;
  - увеличена типографика CTA/Outlined-кнопок в деталях и на списке уроков.
- Изменённый файл:
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/ui/LessonContent.kt`.
- Validation:
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileAndroidMain` -> `BUILD SUCCESSFUL`.

## Entry: 2026-04-08 (simulation v2 drag line anchored to hotspot center)
- Date: 2026-04-08
- Task: Исправить смещение swipe/drag линии: стартовая точка должна совпадать с центром hotspot и визуально совпадать с persistent-рендером.
- Root cause:
  - Во `web` transient drag line начиналась из точки нажатия курсора (`event.clientX/Y`),
    тогда как persistent connection рендерится из центра hotspot.
  - Из-за разных anchor-точек появлялось рассогласование «preview vs render» и визуальный сдвиг от центра зоны.
- Decision/Change:
  - `web/src/features/simulation/ui/editor/canvas/ScreenNode.tsx`:
    - `HotspotDragStartHandler` расширен: добавлены `originX/originY`.
    - при старте drag вычисляется центр hotspot из `getBoundingClientRect()` и передаётся в editor.
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`:
    - drag-state разделён на:
      - `pointerStartX/Y` (для порога drag-distance),
      - `startX/Y` (визуальный origin линии, теперь центр hotspot).
    - расчёт `distance` переведён на `pointerStartX/Y`, чтобы не ломать threshold.
    - SVG drag preview (path + стартовая точка) рендерится от центра hotspot.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npx eslint src/features/simulation/ui/editor/SimulationEditor.tsx src/features/simulation/ui/editor/canvas/ScreenNode.tsx` -> passed.

### Update: 2026-04-06 (mobile backstack fix for Home/Learning)

- Исправлено поведение системной кнопки Back, чтобы навигация шла внутри приложения перед выходом:
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/ui/LessonContent.kt`
    - добавлен `BackHandler` для внутреннего стека Learning:
      - `LessonDetails -> CourseLessons -> Courses`.
    - На экране `Courses` back больше не перехватывается (дальше управляет Home-level логика).
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/HomeRoute.kt`
    - добавлен `BackHandler`: если активна не `Courses` вкладка (`Lesson`/`Profile`), back переводит на `Courses` вместо выхода из приложения.
- Результат UX:
  - Внутри вкладки `Обучение` back теперь проходит по внутренним экранам.
  - Из `Lesson`/`Profile` back возвращает на `Главная` вкладку (`Courses`).
  - Выход из приложения остаётся только когда пользователь уже на корневом состоянии Home/Courses.
- Validation:
  - `cd mobile && ./gradlew :feature:home:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:home:impl:compileAndroidMain` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileAndroidMain` -> `BUILD SUCCESSFUL`.

### Update: 2026-04-06 (Learning details cleanup from latest screenshot)

- Исправлены точечные проблемы UI на экране деталей урока (`Learning`):
  - убран артефакт `%%` в блоке прогресса (`Прогресс: 50%` вместо `50%%`);
  - повышена читаемость disabled CTA в preview-режиме через явные disabled-colors.
- Изменённые файлы:
  - `mobile/feature/player/impl/src/commonMain/composeResources/values/strings.xml`
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/ui/LessonContent.kt`
- Validation:
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileAndroidMain` -> `BUILD SUCCESSFUL`.

### Update: 2026-04-06 (Learning courses cards aligned to mock with photos)

- Перепроверен экран списка курсов Learning относительно эталонного макета (`_1/code.html`) и исправлены основные расхождения:
  - карточки курсов теперь с фото-обложками, бейджем категории, мета-строкой (длительность + прогресс) и прогресс-баром;
  - данные карточек для preview-режима обновлены под структуру макета (длительности, прогресс, подписи, заголовки);
  - для real bundle добавлены вычисления обложки и оценочной длительности;
  - оставлено ограничение области: только Learning, Home не изменялся.
- Изменённые файлы:
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/ui/LessonContent.kt`
- Validation:
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileAndroidMain` -> `BUILD SUCCESSFUL`.

### Update: 2026-04-06 (Learning remaining screens parity pass: lessons + details)

- Перепроверены и доработаны оставшиеся экраны Learning (`_2` и `lesson_details_unified`) без изменений `Home`:
  - `LearningCourseLessonsScreen`:
    - заголовок экрана выровнен под макет (`Обучение` + название курса);
    - прогресс берётся из `completedLessonsCount/totalLessonsCount` и дополнен процентной строкой;
    - строки уроков получили status-badge (`Пройдено/Текущий/Доступен/Заблокирован`);
    - у текущего урока добавлен встроенный progress bar + подпись процента.
  - `LearningLessonDetailsScreen`:
    - добавлен hero-блок с обложкой курса, затемняющим градиентом и бейджем `Базовый курс`;
    - добавлены блоки `О чем этот урок` и `Готовы начать?`;
    - stats-ряд обновлён (длительность берётся из курса, шаги, рейтинг);
    - action layout упрощён: primary CTA + единая secondary-кнопка возврата.
  - Добавлены новые ресурсы в `strings.xml` для статусов, overview/ready блоков, трека, рейтинга и lesson progress.
- Изменённые файлы:
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/ui/LessonContent.kt`
  - `mobile/feature/player/impl/src/commonMain/composeResources/values/strings.xml`
- Validation:
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileAndroidMain` -> `BUILD SUCCESSFUL`.

### Update: 2026-04-06 (Learning final pixel polish pass)

- Финальный пиксель-проход по экранам Learning (`_2` + `lesson_details_unified`) без изменений `Home`:
  - `LearningCourseLessonsScreen`:
    - прогресс курса теперь выводится локализованной строкой формата `Прогресс курса: %d%%`;
    - добавлен более заметный акцент current-урока (бордер вместо заливки), упрощены правые статус-лейблы;
    - блок прогресса текущего урока перестроен под макет: отдельные label/percent + нижний progress bar.
  - `LearningLessonDetailsScreen`:
    - бейдж в hero переведён в `secondaryContainer` стиль (ближе к макету);
    - блок «Готовы начать?» переработан в горизонтальный layout с круглым индикатором процента справа.
- Обновлены строковые ресурсы:
  - изменён `learning_course_your_progress` -> `Прогресс курса: %1$d%%`;
  - добавлены `learning_progress_percent`, `learning_lesson_progress_label`.
- Изменённые файлы:
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/ui/LessonContent.kt`
  - `mobile/feature/player/impl/src/commonMain/composeResources/values/strings.xml`
- Validation:
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileAndroidMain` -> `BUILD SUCCESSFUL`.

### Update: 2026-04-06 (Learning screenshot fixes: header/ready/rating)

- По последнему QA-скриншоту на вкладке Learning внесены точечные правки без изменений `Home`:
  - убран лишний импорт `learning_choose_course_title` (дубликат заголовка не используется в lessons screen);
  - удалён неиспользуемый импорт `learning_lesson_progress`;
  - исправлен fallback в stats-карточке рейтинга: убран лишний ручной `%`, чтобы не получать `%%`.
- Изменённый файл:
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/ui/LessonContent.kt`
- Validation:
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileAndroidMain` -> `BUILD SUCCESSFUL`.

## Entry: 2026-04-06 (learning tab only: stitch_mobile_ui_design 3 refresh)

- **Date:** 2026-04-06
- **Task:** Обновить только вкладку «Обучение» в mobile-приложении по макетам из `/Users/npopov/Downloads/stitch_mobile_ui_design 3`, не изменяя главную вкладку.
- **Decision/Change:**
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/ui/LessonContent.kt`
    - Вкладка `Lesson` перестроена в 3 последовательных экрана внутри player feature:
      - **Courses**: заголовок/подсказка, category chips, preview активного курса (или empty-state с переходом в каталог);
      - **CourseLessons**: карточка прогресса и список уроков со статусами `Completed / InProgress / Available / Locked`;
      - **LessonDetails**: детали текущего урока, stats-карточки, outcomes, CTA `Начать урок`.
    - Интеграция с существующим MVI сохранена:
      - выбор урока -> `PlayerIntent.NavigateToScreen(screenKey)`;
      - запуск урока -> `PlayerIntent.EnterFullscreen`;
      - возврат к каталогу -> `PlayerIntent.Close`.
    - `home`-экран и логика вкладки `Главная` не модифицировались.
  - `mobile/feature/player/impl/src/commonMain/composeResources/values/strings.xml`
    - Добавлены ресурсы для новых экранов обучения (заголовки, категории, прогресс, CTA) и plural для времени курса.
- **Validation:**
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinMetadata` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> после фикса smart-cast ошибок -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileAndroidMain` -> `BUILD SUCCESSFUL`.

## Entry: 2026-04-06 (mobile debug backend URL override fix)

- **Date:** 2026-04-06
- **Task:** Устранить причину ошибки «Проверьте интернет» на физическом Android-устройстве при запущенном локальном backend.
- **Decision/Change:**
  - Root cause: debug `BACKEND_BASE_URL` был жёстко зашит в `http://10.0.2.2:8000`, что работает только в Android Emulator и не работает на физическом телефоне.
  - `mobile/androidApp/build.gradle.kts`
    - Добавлен helper `gradleStringProperty(name, defaultValue)`.
    - Для `debug` URL теперь берётся из `-Pmobile.debugBackendBaseUrl=...` (default остаётся `http://10.0.2.2:8000`).
    - Для `release` URL добавлен аналогичный override `-Pmobile.releaseBackendBaseUrl=...` (default `https://api.example.com`).
  - `mobile/README.md`
    - Обновлён раздел `Backend URL` с явным способом запуска debug-сборки для физического устройства через LAN IP.
- **Validation:**
  - `cd mobile && ./gradlew :androidApp:assembleDebug` -> `BUILD SUCCESSFUL`.

## Entry: 2026-04-06 (stitch_mobile_ui_design 3: home-based integration)

- **Date:** 2026-04-06
- **Task:** Внедрить экраны из `/Users/npopov/Downloads/stitch_mobile_ui_design 3` в текущую mobile-архитектуру без вывода новых top-level route.
- **Decision/Change:**
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/HomeScreen.kt`
    - Полностью переработан UI shell вкладок `Courses` и `Lesson` под новый экспорт.
    - `Courses` теперь соответствует макету каталога:
      - заголовок «Обучение», поисковый блок, category chips,
      - список карточек курсов с hero, метаданными и progress bar.
    - `Lesson` реализован как двухшаговый flow внутри Home:
      - список уроков курса с состояниями `Completed / Current / Available / Locked`,
      - детальная карточка урока (hero, chips, outcomes, mentor/progress card, фиксированная CTA).
    - CTA «Начать урок» интегрирована с существующим player MVI через
      - `PlayerIntent.NavigateToScreen(screenKey)` + `PlayerIntent.EnterFullscreen`.
    - Fullscreen player не тронут и по-прежнему включается через `playerUiEntry.shouldShowFullscreen(...)`.
  - `mobile/feature/home/impl/src/commonMain/composeResources/values/strings.xml`
    - Обновлены/добавлены строковые ресурсы под новые блоки каталога, статусы уроков и details-экран.
- **Validation:**
  - `cd mobile && ./gradlew :feature:home:impl:compileKotlinMetadata` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :androidApp:compileDebugKotlin` -> `BUILD SUCCESSFUL` (компиляция `feature:home:impl:compileAndroidMain` прошла внутри этой сборки).
  - Попытка `:feature:home:impl:compileKotlinAndroid` невалидна для данного модуля (таск отсутствует), использована корректная Android app compile-проверка.

## Entry: 2026-04-06 (mobile screen structure discovery)

- **Date:** 2026-04-06
- **Task:** Identify current mobile screen structure, NavHost setup, and top-level feature ownership before stitching in new Stitch-exported screens.
- **Findings:**
  - App entry is `mobile/shared/src/commonMain/kotlin/com/digitaledu/shared/DigitalEduApp.kt`, which delegates to `feature/root/impl/RootRoute.kt`.
  - Root navigation lives in `mobile/feature/root/impl/src/commonMain/kotlin/com/digitaledu/feature/root/impl/navigation/RootNavHost.kt` and only wires `auth` + `home` routes.
  - `auth` owns its own nested NavHost inside `mobile/feature/auth/impl/src/commonMain/kotlin/com/digitaledu/feature/auth/impl/AuthScreen.kt`.
  - `home` is the shell screen in `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/HomeScreen.kt`; it hosts `catalog`, `lesson/player`, and `profile` content.
  - `catalog`, `player`, and `profile` currently expose UI-entry/content interfaces from their `api` modules and are rendered from home rather than through separate top-level routes.
- **Next step:** Patch exact screen/navigation files for the Stitch export and wire any new screen into the owning feature module.

## Entry: 2026-04-06 (stitch mobile ui design 3 implementation)

- **Date:** 2026-04-06
- **Task:** Реализовать экраны из `stitch_mobile_ui_design 3` в mobile-приложении (курсы, список уроков, детали урока) с сохранением текущей модульной архитектуры `home/player`.
- **Decision/Change:**
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/HomeScreen.kt`
    - Полностью обновлён контент вкладки `Courses` под предоставленный дизайн:
      - заголовок «Обучение», поисковый блок, фильтры-чипы категорий;
      - крупные course-cards с hero-превью, category-chip, описанием, длительностью и progress bar;
      - удалены legacy-блоки (`ContinueLearningCard`, рекомендательный список) для соответствия новому макету.
    - Вкладка `Lesson` теперь рендерит player-tab без промежуточного заголовочного обвеса из старого home-экрана.
  - `mobile/feature/home/impl/src/commonMain/composeResources/values/strings.xml`
    - Добавлены строки для новых фильтров и empty-state курсов.
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/ui/LessonContent.kt`
    - Экран полностью переработан в двухуровневый flow:
      - **Overview**: список модулей с состояниями `Пройдено / Сейчас / Доступно / Закрыто`, прогресс по курсу, back-action в каталог;
      - **Details**: hero-блок, metadata chips, описание урока, outcomes, progress-card, mentor-card и фиксированная CTA «Начать урок».
    - Интеграция с существующим Player MVI сохранена:
      - при открытии деталей отправляется `PlayerIntent.NavigateToScreen(screenKey)`;
      - запуск урока отправляет `NavigateToScreen` + `EnterFullscreen`.
  - `mobile/feature/player/impl/src/commonMain/composeResources/values/strings.xml`
    - Добавлены строковые ресурсы для новых состояний карточек, модульных заголовков, details-экрана и прогресс-блоков.
- **Validation:**
  - `cd mobile && ./gradlew :feature:home:impl:compileKotlinMetadata :feature:player:impl:compileKotlinMetadata` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileAndroidMain` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :androidApp:assembleDebug` -> `BUILD SUCCESSFUL`.
  - `lsp_diagnostics` в этой среде недоступен (таймаут инициализации kotlin-lsp), поэтому верификация выполнена через Gradle compile/build.

## Entry: 2026-04-06 (web-admin auth token enforcement for catalog reads)

- **Date:** 2026-04-06
- **Task:** Исправить ошибку `Требуется токен авторизации` в web-admin и исключить повторные вызовы защищённых catalog endpoint без Bearer токена.
- **Decision/Change:**
  - Root-cause: серверные страницы web-admin (`/catalog`, `/groups`, `/progress`, `/dashboard`) вызывали `fetchCourses()` без `Authorization`, при этом backend `/api/v1/catalog/courses?include_drafts=true&include_archived=true` требует auth-зависимость и возвращает 401 (`Требуется токен авторизации.`).
  - В `web/src/features/catalog/api.ts` изменён контракт `fetchCourses`:
    - было: `fetchCourses(): Promise<CourseDto[]>`
    - стало: `fetchCourses(accessToken: string): Promise<CourseDto[]>`
  - Добавлен единый helper `buildAuthHeaders(accessToken)` и переиспользован в `fetchCourses` и `fetchCourseReleases`, чтобы избежать расхождений по Authorization header.
  - Обновлены все серверные call-sites на явную передачу токена из cookie:
    - `web/app/catalog/page.tsx`
    - `web/app/groups/page.tsx`
    - `web/app/progress/page.tsx`
    - `web/app/dashboard/page.tsx`
  - Защитный эффект: теперь TypeScript не позволит вызвать `fetchCourses` без access token на новых страницах.
- **Validation:**
  - `cd web-admin && npm run type-check` -> passed.
  - `cd web-admin && npm run lint` -> passed with pre-existing warnings unrelated to this change.
  - `cd web-admin && npm run build` -> fails on pre-existing `/search` page issue (`useSearchParams() should be wrapped in a suspense boundary`), not related to auth-token fix.

## Entry: 2026-04-06 (infrastructure bootstrap + registration E2E verified + Ktor rusification)

- **Date:** 2026-04-06
- **Task:** Запустить backend+postgres и проверить регистрацию end-to-end.
- **Decision/Change:**
  - Docker registry недоступен (connection refused к registry-1.docker.io) — образ python:3.12-slim не загружается. Бэкенд запущен напрямую через uvicorn на host-машине.
  - База данных была в промежуточном состоянии (только 2 таблицы). Сделан полный reset:
    - `DROP SCHEMA public CASCADE` + `CREATE SCHEMA public`
    - `alembic upgrade head` -> все 18 миграций применены успешно.
    - 22 таблицы в public, версия alembic: `0018_add_assistant_role`.
  - Бэкенд запущен: `uvicorn app.main:app --host 0.0.0.0 --port 8000` (PID в фоне).
  - KtorCallExecutor полностью русифицирован:
    - `"Client error: {code}"` -> `"Ошибка клиента: {code}"`
    - `"Server error: {code}"` -> `"Ошибка сервера: {code}"`
    - `"Redirect error: {code}"` -> `"Ошибка перенаправления: {code}"`
    - Generic catch -> `"Ошибка сети. Проверьте подключение к интернету и убедитесь, что сервер включён."`
  - E2E регистрация подтверждена:
    - `POST /api/v1/auth/register` -> 200 OK с `access_token`, `refresh_token`, `user_id`.
- **Validation:**
  - `curl -s http://localhost:8000/api/v1/health` -> `{"status": "ok"}`
  - `curl -s -X POST http://localhost:8000/api/v1/auth/register -d '{"full_name": "Test User", "login": "testuser123", "password": "password123"}'` -> 200 с токенами.
  - `cd mobile && ./gradlew :feature:auth:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.

## Entry: 2026-04-06 (mobile registration end-to-end implementation)

- **Date:** 2026-04-06
- **Task:** Починить мобильную регистрацию, которая ранее была placeholder-flow без сетевого вызова.
- **Decision/Change:**
  - Backend:
    - Добавлен публичный контракт регистрации:
      - `backend/app/modules/auth/api/schemas.py` -> `RegisterIn(full_name, login, password)`
      - `backend/app/modules/auth/api/router.py` -> `POST /api/v1/auth/register`
    - В доменном сервисе добавлен реальный сценарий:
      - `backend/app/modules/auth/domain/services.py` -> `AuthService.register(...)`
      - валидация входных данных, проверка уникальности логина, создание пользователя USER, выдача access/refresh токенов.
    - Добавлена локализация новых ошибок в роутере:
      - `Invalid registration data.` -> `Некорректные данные регистрации.`
      - `Login is already taken.` -> `Логин уже занят.`
    - Исправлен type issue в затронутом файле `router.py`:
      - `_compute_permissions_from_db` теперь принимает `UserRole` (без Pyright mismatch при `ROLE_PERMISSION_TEMPLATES.get(...)`).
  - Backend tests:
    - `backend/tests/test_auth_service.py` -> покрыты `register` success + duplicate login + invalid full_name.
    - `backend/tests/test_api_auth.py` -> добавлены интеграционные проверки `/auth/register`.
    - `backend/tests/test_auth_api_router_branches.py` -> добавлены register-ветки для success/error branch coverage.
  - Mobile network/data:
    - `mobile/core/network/.../AuthNetworkDataSource.kt` -> добавлен `register(...)`.
    - `mobile/core/network/.../ktor/RegisterPayload.kt` -> новый DTO (`full_name`, `login`, `password`).
    - `mobile/core/network/.../ktor/KtorAuthNetworkDataSource.kt` -> вызов `POST api/v1/auth/register`.
    - `mobile/core/data/.../AuthRepository.kt` -> добавлен `register(...)`.
    - `mobile/core/data/.../NetworkAuthRepository.kt` -> реализация register + обновление сессии токенов.
  - Mobile auth UI wiring:
    - `RegistrationIntent.SubmitClicked` переведён на parameterless intent.
    - `RegistrationViewModel` теперь зависит от `AuthRepository` и делает реальный `authRepository.register(...)` с обработкой ошибки через `toUserMessage()`.
    - `RegistrationEffect` изменён на `Registered`.
    - `RegistrationScreen` подписан на эффекты и вызывает `onRegistered()` при успехе.
    - `AuthScreen` передаёт `onRegistered = onAuthenticated` (автовход после регистрации).
    - `AuthFeatureModule` обновлён: `RegistrationViewModel(authRepository = get())`.
- **Validation:**
  - Backend auth test suite:
    - `cd backend && PYTHONPATH=. pytest tests/test_auth_service.py tests/test_api_auth.py tests/test_auth_api_router_branches.py tests/test_auth_repository.py tests/test_auth_deps.py tests/test_auth_helpers.py tests/test_auth_permissions.py`
    - Result: `54 passed`.
  - Mobile compile:
    - `cd mobile && ./gradlew :core:network:compileKotlinJvm :core:data:compileKotlinJvm :feature:auth:impl:compileKotlinJvm`
    - Result: `BUILD SUCCESSFUL`.

## Entry: 2026-04-06 (backend auth contract inspection)

- **Date:** 2026-04-06
- **Task:** Inspect backend auth/registration contract for mobile registration issues.
- **Finding:**
  - Public auth routes currently exposed under `/api/v1/auth` are `login`, `qr/activate`, `refresh`, `logout`, `me`, and `PATCH /me`.
  - There is **no public registration endpoint** in the backend auth module; user creation only happens via startup seeding/bootstrap or internal QR activation when unbound.
  - `LoginIn` is the only request shape for sign-in (`login`, `password`), so mobile sign-up payloads with other field names will not create users.
- **Validation:**
  - Reviewed `backend/app/modules/auth/api/router.py`, `schemas.py`, `domain/services.py`, `infra/repository.py`, and auth API tests.

## Entry: 2026-04-06 (stitch UI 1:1 migration for home/profile/settings)

- **Date:** 2026-04-06
- **Task:** Реализовать экраны из `stitch_mobile_ui_design 2` в mobile-приложении максимально близко к макету (home, profile, accessibility settings, account settings).
- **Decision/Change:**
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/HomeScreen.kt`
    - Полностью переработан shell домашнего экрана:
      - кастомная нижняя навигация в стиле макета (активная pill-кнопка),
      - плавающая SOS-кнопка для `HomeTab.Courses`,
      - новый контент `HomeCoursesContent` с:
        - строкой поиска + микрофон,
        - карточкой «Продолжить обучение» с прогрессом,
        - блоком «Рекомендуем вам» и карточками рекомендаций.
      - для `HomeTab.Lesson` оставлен текущий плеер, но добавлен новый заголовочный блок в стиле обновлённого UI.
  - `mobile/feature/home/impl/src/commonMain/composeResources/values/strings.xml`
    - обновлены/добавлены строки под новый home-макет (`Главная`, `Спросите помощника...`, `Продолжить обучение`, `SOS`, и т.д.).
  - `mobile/feature/profile/impl/src/commonMain/kotlin/com/digitaledu/feature/profile/impl/ui/ProfileContent.kt`
    - Полностью заменён минимальный профиль на многоэкранный UX внутри вкладки Profile:
      - `ProfileMain` (карточка пользователя, быстрые действия, прогресс, настройки, logout),
      - `AccessibilitySettings` (preview + 4 toggle-переключателя),
      - `AccountSettings` (email-привязка + список security-настроек),
      - локальная навигация секций через `rememberSaveable` (`ProfileSection`).
  - `mobile/feature/profile/impl/src/commonMain/composeResources/values/strings.xml`
    - добавлены строки для новых блоков profile/settings.
  - `mobile/feature/profile/impl/build.gradle.kts`
    - добавлен `compose.materialIconsExtended` для набора иконок макета.
- **Validation:**
  - `cd mobile && ./gradlew :feature:home:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:profile:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - В процессе был один цикл исправления компиляции `ProfileContent.kt` (импорты/layout API и блок items в `LazyColumn`) — после фикса сборка успешна.

## Entry: 2026-04-06 (mobile auth palette sync from design spec)

- **Date:** 2026-04-06
- **Task:** Привести mobile auth-цвета к палитре из предоставленного HTML/Tailwind spec (исправление «неправильного синего» и унификация темы).
- **Decision/Change:**
  - Добавлен единый источник цветов `ProsvetLightColorScheme`:
    - `mobile/core/designsystem/src/commonMain/kotlin/com/digitaledu/core/designsystem/theme/ProsvetColorScheme.kt`
    - В `lightColorScheme(...)` перенесены ключевые токены из спецификации: `primary`, `primaryContainer`, `secondary`, `tertiary`, `error`, `surface*`, `outline*`, `inverse*`.
  - Подключение палитры к платформам:
    - `Theme.android.kt`, `Theme.jvm.kt`, `Theme.ios.kt` теперь используют `ProsvetLightColorScheme` как базовую схему.
    - В `DigitalEduTheme.kt` default `dynamicColor` переключён на `false`, чтобы системный dynamic color не переопределял фирменный синий.
  - Убраны последние hardcoded hex в auth-related shared UI:
    - `mobile/core/ui/src/commonMain/kotlin/com/digitaledu/core/ui/components/ProsvetLogo.kt`
    - Логотип переведён на `MaterialTheme.colorScheme.primary/secondary`.
- **Validation:**
  - `cd mobile && ./gradlew :feature:auth:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - Дополнительно проверено grep-поиском: в `mobile/feature/auth/**` и `mobile/core/ui/components/**` больше нет `Color(0x...)`.

## Entry: 2026-04-05 (mobile auth screen file extraction phase 1)

- **Date:** 2026-04-05
- **Task:** Вынести монолитный `AuthScreen.kt` мобильного auth feature в отдельные файлы без изменения поведения (Phase 1 refactor).
- **Decision/Change:**
  - `mobile/feature/auth/impl/src/commonMain/kotlin/com/digitaledu/feature/auth/impl/AuthScreen.kt` сокращён до `PColors`, route constants и `AuthRoute` с тем же `NavHost`.
  - Добавлены отдельные файлы:
    - `OnboardingScreen.kt`
    - `LoginScreen.kt`
    - `RegistrationScreen.kt`
    - `QrLoginScreen.kt`
    - `PasswordRecoveryScreen.kt`
    - `AuthSharedComponents.kt`
  - Общие composable-компоненты вынесены в отдельный файл с `internal` visibility; `PColors` открыт на package-level для повторного использования в sibling files.
  - Визуальная логика, тексты, spacing и навигационные переходы сохранены без изменения.
- **Validation:**
  - `lsp_diagnostics` для Kotlin-файлов не смог выполниться в среде: `kotlin-lsp` не установлен.
  - `cd mobile && ./gradlew :feature:auth:impl:build` -> `BUILD SUCCESSFUL`.

## Entry: 2026-04-05 (mobile auth refactor phases 2-5)

- **Date:** 2026-04-05
- **Task:** Завершить глубокий рефакторинг мобильного Auth flow (тема/токены, MVI для registration/recovery, перенос shared UI в core:ui, правка QR-flow).
- **Decision/Change:**
  - Theme/tokens:
    - Удалён `PColors`; auth-экраны переведены на `MaterialTheme.colorScheme`.
    - Ошибочные hardcoded-цвета заменены на `error`, `errorContainer`, `onErrorContainer`.
  - MVI:
    - Добавлены `RegistrationUiState`, `RegistrationIntent`, `RegistrationEffect`, `RegistrationViewModel`.
    - Добавлены `RecoveryUiState`, `RecoveryIntent`, `RecoveryEffect`, `RecoveryViewModel`.
    - `RegistrationScreen` и `PasswordRecoveryScreen` переведены с локального `rememberSaveable` состояния на ViewModel + intents.
    - `AuthFeatureModule` расширен factory-биндингами для новых ViewModel.
  - Shared UI components:
    - Создан `mobile/core/ui/src/commonMain/kotlin/com/digitaledu/core/ui/components/AuthComponents.kt`.
    - Перенесены компоненты: `GradientPrimaryButton`, `ProsvetTextField`, `SecurityInfoCard`, `AuthHeader`, `FieldLabel`, `PasswordToggle`.
    - `mobile/feature/auth/impl/.../AuthSharedComponents.kt` удалён.
    - В `mobile/core/ui/build.gradle.kts` добавлен `implementation(compose.materialIconsExtended)` для иконок shared-компонентов.
  - QR flow:
    - В `QrLoginScreen` убран немедленный принудительный переход в manual login после скана.
    - После успешного скана показывается статус, а обработка токена остаётся через deep-link path и backend-resolve в Home flow.
- **Validation:**
  - `cd mobile && ./gradlew :feature:auth:impl:compileKotlinJvm --no-daemon` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:auth:impl:build --no-daemon` -> `BUILD SUCCESSFUL`.

## Entry: 2026-04-05 (mobile theme policy hardening)

- **Date:** 2026-04-05
- **Task:** Закрепить policy: в mobile UI использовать только theme/token source не только для цветов, но и для typography/fonts/shapes/spacing/elevation.
- **Decision/Change:**
  - `mobile/docs/mobile-architecture.md`:
    - Добавлен раздел `Full theme token policy (mandatory)` с требованиями для:
      - typography/fonts,
      - colors,
      - shapes/radius,
      - elevation/shadows,
      - spacing,
      - icons/strokes/alpha,
      - PR gate и допустимые исключения.
  - `.context/architecture/design_system.md`:
    - Добавлены enforce-правила для typography/fonts/shapes/spacing/elevation/token bypass.
- **Validation:**
  - Документационные изменения согласованы со структурой текущих mobile архитектурных правил; добавлены как обязательный review gate.

## Entry: 2026-04-05 (mobile auth full theme-token migration)

- **Date:** 2026-04-05
- **Task:** Перевести Auth UI на полный token-based стиль (typography/fonts/shapes/spacing/elevation/opacity) в соответствии с новым policy.
- **Decision/Change:**
  - Добавлен общий token-layer:
    - `mobile/core/ui/src/commonMain/kotlin/com/digitaledu/core/ui/components/AuthUiTokens.kt`
    - Включает: `AuthUiTypography`, `AuthUiSpacing`, `AuthUiSize`, `AuthUiShapes`, `AuthUiStroke`, `AuthUiOpacity`.
  - `mobile/core/ui/.../AuthComponents.kt`:
    - Убраны прямые `fontSize/lineHeight`, `RoundedCornerShape/CircleShape`, literal alpha и dp-значения;
    - Компоненты используют token-layer + `MaterialTheme.colorScheme`.
  - Auth screens (`OnboardingScreen`, `LoginScreen`, `RegistrationScreen`, `PasswordRecoveryScreen`, `QrLoginScreen`):
    - Убраны hardcoded typography значения (`fontSize`, `lineHeight`), shape literals и ad-hoc spacing;
    - Везде подключены shared auth tokens и theme-based styles.
- **Validation:**
  - `cd mobile && ./gradlew :feature:auth:impl:compileKotlinJvm --no-daemon` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:auth:impl:build --no-daemon` -> `BUILD SUCCESSFUL`.
  - grep-check по auth scope (`feature/auth/impl` + `core/ui/AuthComponents.kt`) не выявил:
    - `Color(0x...)`,
    - `fontSize=`, `lineHeight=`,
    - `RoundedCornerShape(...)`, `CircleShape`,
    - literal alpha вида `alpha = 0.x`.

## Entry: 2026-04-05 (mobile non-auth token migration + enforcement automation)

- **Date:** 2026-04-05
- **Task:** Расширить token-based миграцию на non-auth mobile UI и зафиксировать автоматический guard для дальнейшей разработки.
- **Decision/Change:**
  - Automation guard:
    - Добавлен `scripts/check-mobile-theme-tokens.sh`.
    - Подключен в `scripts/pre-commit.sh` для staged `mobile/` файлов.
    - Добавлен manual target `make mobile-theme-guard` в `Makefile`.
  - Workflow/documentation:
    - `.context/operations/workflow.md` обновлён: mobile theme-token guard включён в Local Pre-Commit Gate.
    - `AGENTS.md` обновлён: в разделе hooks зафиксирован mobile theme-token guard.
  - Non-auth refactor (high-impact):
    - `feature/catalog/impl/ui/CoursesContent.kt`:
      - убраны `Color(0x...)` палитры;
      - hardcoded overlay/text colors заменены на theme colors;
      - shape/alpha значения переведены на token constants.
    - `feature/player/impl/ui/player/components/VideoStory.kt`:
      - hardcoded black/white/darkgray заменены на theme colors.
    - `feature/player/impl/ui/player/SimulationScreen.kt`:
      - hotspot colors/shapes/alpha переведены на token constants + theme colors.
    - `feature/player/impl/ui/player/components/ArticleStory.kt`:
      - убран ad-hoc lineHeight multiplier; используется theme typography напрямую.
    - `feature/profile/impl/ui/ProfileContent.kt` и `feature/player/impl/ui/LessonContent.kt`:
      - shape/spacing/alpha literals переведены на tokens.
  - Shared non-auth tokens:
    - Добавлен `mobile/core/ui/src/commonMain/kotlin/com/digitaledu/core/ui/components/UiTokens.kt` (`UiSpacing`, `UiSize`, `UiShapes`, `UiOpacity`).
  - Dependency alignment:
    - `mobile/feature/profile/impl/build.gradle.kts` добавлен `implementation(projects.core.ui)`.
- **Validation:**
  - `./scripts/check-mobile-theme-tokens.sh` на затронутых файлах -> passed.
  - `cd mobile && ./gradlew :feature:catalog:impl:compileKotlinJvm --no-daemon` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm --no-daemon` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:profile:impl:compileKotlinJvm --no-daemon` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :core:ui:compileKotlinJvm --no-daemon` -> `BUILD SUCCESSFUL`.

## Entry: 2026-04-05 (mobile non-auth continuation: remaining player/home cleanup)

- **Date:** 2026-04-05
- **Task:** Дозачистить оставшиеся non-auth UI bypasses после первого прогона (player components + home).
- **Decision/Change:**
  - `feature/player/impl`:
    - `QuizStory.kt`, `LessonCheatSheetView.kt`, `StoryStepsProgressBar.kt`, `LessonStoriesPager.kt`, `PlayerContent.kt` переведены на `UiTokens` (shape/spacing/alpha).
  - `feature/home/impl/HomeScreen.kt`:
    - индикатор loading переведен на `UiTokens` (`UiSize`, `UiSpacing`, `UiStroke`).
  - `scripts/check-mobile-theme-tokens.sh`:
    - улучшена логика выбора target files (prefix+extension),
    - разрешения для token/theme sources оставлены целевыми (`*UiTokens.kt`, `mobile/core/designsystem/*`).
  - `mobile/docs/mobile-architecture.md`:
    - в PR Gate добавлен явный пункт: `make mobile-theme-guard`.
- **Validation:**
  - `cd mobile && ./gradlew :feature:home:impl:compileKotlinJvm --no-daemon` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm --no-daemon` -> `BUILD SUCCESSFUL`.
  - `./scripts/check-mobile-theme-tokens.sh` smoke-check -> passed.

## Entry: 2026-04-05 (mobile auth onboarding + QR/recovery screens)

- **Date:** 2026-04-05
- **Task:** Реализовать экраны онбординга и расширенного auth-flow в мобильном приложении по новым макетам (onboarding, login, register, QR, recovery).
- **Decision/Change:**
  - `mobile/feature/auth/impl/src/commonMain/kotlin/com/digitaledu/feature/auth/impl/AuthScreen.kt`:
    - Auth internal navigation расширен до 5 экранов:
      - `auth/onboarding`
      - `auth/login`
      - `auth/register`
      - `auth/qr`
      - `auth/recovery`
    - Start destination auth-флоу переключен на onboarding.
    - Добавлены новые composable-экраны:
      - `OnboardingScreen`
      - `QrLoginScreen`
      - `PasswordRecoveryScreen`
      - обновлённые `AuthScreen` (вход) и `RegistrationScreen`.
    - Добавлен helper `navigateToLogin(...)` для безопасного возврата к login из QR.
    - Сохранено существующее поведение реального входа через `AuthViewModel` и `AuthIntent.LoginClicked`.
  - `mobile/feature/auth/impl/src/commonMain/composeResources/values/strings.xml`:
    - Добавлены новые локализованные строки для onboarding, recovery и QR-flow.
    - Расширены подписи и подсказки для новых CTA/информационных блоков.
- **Validation:**
  - `cd mobile && ./gradlew :feature:auth:impl:compileCommonMainKotlinMetadata` -> passed.
  - `cd mobile && ./gradlew :feature:auth:impl:jvmTest` -> passed (`NO-SOURCE`, без регрессий в модуле).
  - Дополнительно проверено: `cd mobile && ./gradlew :feature:auth:impl:tasks --all` для валидации корректных compile target'ов модуля.

## Entry: 2026-04-04 (group QR flow: admin generate -> mobile scan -> open group learning)

- **Date:** 2026-04-04
- **Task:** Реализовать сквозной флоу для групповых занятий: генерация QR в админке, сканирование в мобильном приложении, открытие обучения по группе.
- **Decision/Change:**
  - Backend (`groups` module):
    - Добавлены endpoint'ы:
      - `POST /api/v1/groups/{group_id}/qr` — генерация QR deep-link для группы.
      - `GET /api/v1/groups/qr/{token}` — резолв QR для участника группы в `course_slug`.
    - Добавлена модель хранения QR токенов группы: `group_join_qr_tokens`.
    - Добавлена миграция `c9f8b7ad6e21_add_group_join_qr_tokens.py`.
    - Валидации:
      - QR только для активной группы.
      - Доступ к резолву только для участников группы.
      - Резолв только в активное/запланированное назначение, учитывая target users.
  - Web admin (`web`):
    - Добавлен admin proxy route: `web/app/api/admin/groups/[groupId]/qr/route.ts`.
    - Добавлен API client `generateGroupQr(...)`.
    - В UI `groups-workspace` добавлен сценарий:
      - кнопка генерации QR,
      - модальное окно с QR изображением,
      - deep-link и копирование ссылки,
      - регенерация QR.
    - Добавлены типы `GroupQrDto`.
    - Подключена зависимость `qrcode` (+ `@types/qrcode`).
  - Mobile (`androidApp` + shared modules):
    - Добавлен deep-link intent-filter для `digitaledu://group/join/{token}`.
    - `MainActivity` парсит QR token из URI и передаёт его в shared app.
    - Добавлены `GroupsNetworkDataSource` + `GroupQrRepository`.
    - Home flow теперь обрабатывает pending QR token, вызывает backend resolve и открывает курс через существующий `CatalogIntent.OpenCourse(...)`.
    - Сигнал token-consumed протянут через `DigitalEduApp` -> `RootRoute` -> `RootNavHost` -> `HomeFeatureEntry`.
- **Validation:**
  - Backend:
    - `ruff check` по изменённым backend-файлам — passed.
    - `PYTHONPATH=. pytest tests/test_groups_service.py tests/test_groups_api_router_branches.py` — `8 passed`.
    - `python3 -m alembic upgrade head` — migration applied.
  - Web:
    - `npm run type-check` — passed.
    - `npm run lint` — no errors (есть pre-existing warnings вне текущего scope).
    - `npm run build` — pre-existing failure на `/search` (`useSearchParams` вне Suspense), не связано с QR флоу.
  - Mobile:
    - `./gradlew test` — BUILD SUCCESSFUL.

## Entry: 2026-04-04 (QR flow smoke e2e test scenario)

- **Date:** 2026-04-04
- **Task:** Добавить воспроизводимый smoke-сценарий для QR-флоу групповых занятий.
- **Decision/Change:**
  - Добавлен интеграционный smoke-тест:
    - `backend/tests/test_group_qr_flow_smoke.py`
  - Сценарий теста:
    1. создаёт admin/user + курс,
    2. создаёт группу,
    3. добавляет участника,
    4. создаёт назначение курса,
    5. генерирует QR (`POST /api/v1/groups/{group_id}/qr`),
    6. резолвит токен как участник (`GET /api/v1/groups/qr/{token}`),
    7. проверяет совпадение `group_id` и `course_slug`.
- **Validation:**
  - `cd backend && ruff check tests/test_group_qr_flow_smoke.py` -> passed.
  - `cd backend && PYTHONPATH=. pytest tests/test_group_qr_flow_smoke.py` -> `1 passed`.

## Entry: 2026-04-04 (group QR auto-join behavior)

- **Date:** 2026-04-04
- **Task:** Изменить QR-flow: при сканировании пользователь автоматически попадает в группу (если ещё не состоит).
- **Decision/Change:**
  - `backend/app/modules/groups/domain/services.py`:
    - в `resolve_group_qr_link(...)` убрана блокировка по отсутствию membership;
    - добавлен auto-join через `add_group_member_if_missing(...)` перед резолвом назначения.
  - `backend/app/modules/groups/infra/repository.py`:
    - добавлен метод `add_group_member_if_missing(group_id, user_id)`.
  - Обновлены тесты:
    - `backend/tests/test_groups_service.py` — auto-join и успешный resolve;
    - сохранены проверки на множественные подходящие назначения (`409`).
- **Validation:**
  - `cd backend && ruff check app/modules/groups/domain/services.py app/modules/groups/infra/repository.py tests/test_groups_service.py tests/test_group_qr_flow_smoke.py` -> passed.
  - `cd backend && PYTHONPATH=. pytest tests/test_groups_service.py tests/test_groups_api_router_branches.py tests/test_group_qr_flow_smoke.py` -> `10 passed`.

## Entry: 2026-04-04 (QR auto-join atomicity hardening)

- **Date:** 2026-04-04
- **Task:** Убрать side-effect membership при неуспешном QR resolve (404/409).
- **Decision/Change:**
  - `resolve_group_qr_link(...)` в `backend/app/modules/groups/domain/services.py` изменён на атомарный порядок:
    1. сначала вычисляется единственное подходящее назначение,
    2. затем выполняется `add_group_member_if_missing(...)`,
    3. затем возвращается resolve-result.
  - Это исключает кейсы, когда пользователь добавлялся в группу при ошибке resolve.
  - Расширены тесты в `backend/tests/test_groups_service.py`:
    - проверка, что при `409` (множественные назначения) membership не пишется;
    - проверка, что при `404` (нет подходящего назначения) membership не пишется.
- **Validation:**
  - `cd backend && ruff check app/modules/groups/domain/services.py tests/test_groups_service.py` -> passed.
  - `cd backend && PYTHONPATH=. pytest tests/test_groups_service.py tests/test_groups_api_router_branches.py tests/test_group_qr_flow_smoke.py` -> `11 passed`.

## Entry: 2026-04-05 (assistant role for class helpers)

- **Date:** 2026-04-05
- **Task:** Добавить отдельную роль `assistant` для помощника на занятиях.
- **Decision/Change:**
  - Backend:
    - `backend/app/modules/users/models.py` — в `UserRole` добавлена роль `assistant`.
    - `backend/app/shared/auth/policies.py` — роли `assistant` выданы операционные права:
      - `catalog.read`
      - `groups.view`
      - `groups.manage`
      - `progress.view`
    - Добавлена миграция `backend/migrations/versions/0018_add_assistant_role.py` для сидирования RBAC-прав роли `assistant`.
  - Web admin:
    - `web/src/features/users/components/users-admin-table.tsx` — в выбор ролей добавлен `assistant` с локализованным label.
    - `web/src/features/rbac/types.ts` — роль `assistant` добавлена в `KnownRole`, `KNOWN_ROLES` и `ROLE_LABELS`.
- **Validation:**
  - `cd backend && ruff check app/modules/users/models.py app/shared/auth/policies.py` -> passed.
  - `cd backend && PYTHONPATH=. pytest tests/test_groups_service.py tests/test_groups_api_router_branches.py tests/test_group_qr_flow_smoke.py` -> `11 passed`.
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with pre-existing warnings outside assistant-role scope.

## Entry: 2026-04-03 (runtime fallback bootstrap for role logins)

- **Date:** 2026-04-03
- **Task:** Устранить повторяющийся кейс «не могу войти под methodologist/moderator» даже если startup seed не создал demo-аккаунты.
- **Decision/Change:**
  - В `backend/app/modules/auth/domain/services.py` добавлен fallback-путь `_bootstrap_demo_user_if_needed(...)` в `AuthService.login(...)`.
  - Если пользователь не найден и окружение `development`, сервис создаёт demo-аккаунт на лету для:
    - `methodologist` (и alias `methodist`) с ролью `methodologist`,
    - `moderator`,
    - `user`.
  - Для production fallback явно отключён.
  - Добавлены регрессионные тесты в `backend/tests/test_auth_service.py`:
    - bootstrap demo-пользователей в development;
    - запрет bootstrap в production.
- **Validation:**
  - `ruff check backend/app/modules/auth/domain/services.py backend/tests/test_auth_service.py` -> passed.
  - `cd backend && PYTHONPATH=. pytest tests/test_auth_service.py` -> `19 passed`.
  - `cd backend && PYTHONPATH=. pytest tests/test_api_auth.py` -> `9 passed`.

## Entry: 2026-04-03 (auth seed fix for methodologist/moderator login)

- **Date:** 2026-04-03
- **Task:** Починить невозможность входа под ролями methodologist/moderator и добавить защиту от повторения.
- **Decision/Change:**
  - Найдена корневая причина в backend bootstrap demo users:
    - `_seed_default_users_on_startup()` в `backend/app/main.py` вызывал `repo.create_user(..., display_name=...)`.
    - `AuthRepository.create_user()` не принимал параметр `display_name`, что приводило к `TypeError` внутри `try/except` и проглатыванию ошибки.
    - В результате demo-пользователи `methodologist`/`moderator` не создавались, и вход их кредами всегда падал как `Invalid credentials`.
  - Исправлено в `backend/app/modules/auth/infra/repository.py`:
    - `create_user()` расширен параметром `display_name: str | None = None`.
    - `display_name` теперь сохраняется в модель `User`.
  - Добавлена регрессионная защита:
    - `backend/tests/test_auth_repository.py` — проверка, что `create_user(..., display_name=...)` корректно сохраняет имя.
    - `backend/tests/test_auth_service.py` — уточнение bootstrap-ассертов (для admin path), что совместимость сигнатуры сохранена.
- **Validation:**
  - LSP diagnostics clean для изменённых файлов.
  - `cd backend && PYTHONPATH=. pytest tests/test_auth_repository.py tests/test_auth_service.py` -> `19 passed`.

## Entry: 2026-04-03 (data-loss protection guards)

- **Date:** 2026-04-03
- **Task:** Добавить защиту от случайного удаления данных через runtime/Makefile команды.
- **Decision/Change:**
  - В `run` включены safety-guard'ы для destructive reset:
    - `AUTO_FIX_BROKEN_DB_SCHEMA` default changed to `0`.
    - Добавлены `ALLOW_DB_SCHEMA_RESET` (default `0`) и `CONFIRM_DB_RESET`.
    - `reset_db_public_schema()` теперь отказывается делать `DROP SCHEMA public` без явного тройного подтверждения.
    - Для форс-режима теперь требуется одновременно:
      - `AUTO_FIX_BROKEN_DB_SCHEMA=1`
      - `ALLOW_DB_SCHEMA_RESET=1`
      - `CONFIRM_DB_RESET=YES_I_UNDERSTAND_DATA_LOSS`
  - В `Makefile` для reset target'ов добавлен двухфакторный guard (`ALLOW_DATA_RESET` + `CONFIRM_DATA_RESET`):
    - `builder-mocks-reset`
    - `progress-mocks-reset`
    - `literacy-demo-reset`
    - `literacy-demo-realistic-reset`
- **Validation:**
  - `bash -n run` -> passed.
  - `make builder-mocks-reset` без `ALLOW_DATA_RESET=1 CONFIRM_DATA_RESET=YES_I_UNDERSTAND_DATA_LOSS` -> blocked as expected.


## Entry: 2026-04-03 (shared Docker auto-start bootstrap)

- **Date:** 2026-04-03
- **Task:** Убрать дублирование и сделать единый механизм автоподъёма Docker для `run` и `make doctor`.
- **Decision/Change:**
  - Добавлен новый общий скрипт:
    - `scripts/ensure-docker.sh`
    - поведение: проверяет `docker info`, пытается запустить Docker Desktop (`open -a Docker`), ждёт готовность daemon, при таймауте завершает с понятной ошибкой.
  - В `run` заменена локальная реализация `ensure_docker_daemon()` на вызов общего скрипта:
    - `DOCKER_ENSURE_PREFIX='[run]'` + `DOCKER_STARTUP_TIMEOUT`.
  - В `Makefile` цель `doctor` переключена на общий скрипт:
    - `DOCKER_ENSURE_PREFIX='[doctor]' DOCKER_STARTUP_TIMEOUT=... ./scripts/ensure-docker.sh`.
- **Validation:**
  - `bash -n scripts/ensure-docker.sh` -> passed.
  - `bash -n run` -> passed.
  - `DOCKER_STARTUP_TIMEOUT=3 DOCKER_ENSURE_PREFIX='[test]' ./scripts/ensure-docker.sh` -> корректный timeout/fail path.
  - `make doctor` -> использует новый общий скрипт и корректно выдаёт timeout path при неготовом Docker daemon.


## Entry: 2026-04-03 (course authorship access-control hardening)

- **Date:** 2026-04-03
- **Task:** Доделать авторство курса и закрыть обходы доступа methodologist к чужим сущностям через lesson/task/release endpoint'ы.
- **Decision/Change:**
  - Усилены проверки доступа в `backend/app/modules/catalog/api/router.py`:
    - добавлены helper'ы:
      - `_ensure_methodologist_lesson_access(...)`
      - `_ensure_methodologist_task_access(...)`
    - проверки применены к route'ам с `lesson_id`/`task_id`, где ранее можно было попасть в чужой курс по прямому идентификатору:
      - `PATCH/DELETE /lessons/{lesson_id}`
      - `POST /lessons/{lesson_id}/restore`
      - `GET/POST /lessons/{lesson_id}/tasks`
      - `PATCH/DELETE /tasks/{task_id}`
      - `POST /tasks/{task_id}/duplicate`
      - `POST /lessons/{lesson_id}/tasks/{task_id}/reorder`
  - Исправлена типизация `author_names.get(...)` в `list_courses` (обработка `author_id is None`).
  - Актуализированы backend тесты под новую политику доступа и сигнатуры сервиса:
    - `backend/tests/test_api_catalog.py`
    - `backend/tests/test_catalog_api_router_branches.py`
- **Validation:**
  - Runtime API smoke (localhost:8000):
    - `GET /api/v1/catalog/courses` без токена -> `401` (`Authorization token is required.`).
    - Methodologist для чужого admin-course/release/lesson/task -> `403` с деталями про недостаток прав.
    - Methodologist для собственных course/lesson/task endpoint'ов -> `200` (операции доступны).
  - LSP diagnostics для изменённых файлов -> clean.
  - `cd backend && ruff check app/modules/catalog/api/router.py tests/test_api_catalog.py tests/test_catalog_api_router_branches.py` -> passed.
  - `cd backend && APP_DATABASE_URL=...5432... TEST_DATABASE_URL=...5432... PYTHONPATH=. pytest tests/test_api_catalog.py tests/test_catalog_api_router_branches.py` -> `12 passed`.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-03 (moderation module api/domain/infra implementation)

- **Date:** 2026-04-03
- **Task:** Create moderation module API/domain/repository layer for release review workflow.
- **Decision/Change:**
  - Added moderation API package and schemas:
    - `backend/app/modules/moderation/api/schemas.py`
    - input DTOs for submit/approve/reject and output DTOs for review/history/pending queue.
  - Added moderation router:
    - `backend/app/modules/moderation/api/router.py`
    - endpoints:
      - `POST /releases/{release_id}/submit`
      - `POST /releases/{release_id}/approve`
      - `POST /releases/{release_id}/reject`
      - `GET /releases/pending`
      - `GET /releases/{release_id}/history`
    - policy guards via `require_policy(...)` and `ModerationError -> HTTPException` mapping.
  - Added domain layer:
    - `backend/app/modules/moderation/domain/errors.py`
    - `backend/app/modules/moderation/domain/services.py`
    - transition methods with status validation and mandatory creation of review/history records.
  - Added infra repository:
    - `backend/app/modules/moderation/infra/repository.py`
    - SQLAlchemy select/update/create operations for releases, reviews, and history.
  - Added package init files:
    - `backend/app/modules/moderation/api/__init__.py`
    - `backend/app/modules/moderation/domain/__init__.py`
- **Validation:**
  - To be validated via import/syntax checks for new moderation files.

## Entry: 2026-04-03 (moderation release review persistence scaffold)

- **Date:** 2026-04-03
- **Task:** Extend release status lifecycle and add DB persistence for moderation decisions.
- **Decision/Change:**
  - Extended `ReleaseStatus` enum in `backend/app/modules/catalog/infra/models.py` with:
    - `pending_review`
    - `approved`
    - `rejected`
  - Added moderation infra models in `backend/app/modules/moderation/infra/models.py`:
    - `ReleaseReview` (`release_reviews`)
    - `ReleaseStatusHistory` (`release_status_history`)
  - Registered moderation models in `backend/app/models.py` for Alembic metadata discovery.
  - Added migration `backend/migrations/versions/4c75e110ab1f_add_moderation_review_tables.py`:
    - creates `release_reviews` and `release_status_history`
    - adds indexes and foreign keys
    - includes clean downgrade path
- **Validation:**
  - LSP diagnostics clean for changed Python files.
  - Enum QA command confirms 5 statuses available in `ReleaseStatus`.

## Entry: 2026-04-02 (Mock Data Cleanup — Warehouse Terms Removed)

- **Date:** 2026-04-02
- **Task:** Remove warehouse/logistics terminology from all mock data and align with digital literacy for pensioners domain
- **Decision/Change:**
  - **Problem:** Mock data contained warehouse/logistics group names (РЦ, Склад, Приемка, Комплектовщики) completely inappropriate for pensioner education platform
  - **Files Updated:**
    - `progress-snapshot.md` — replaced 6 warehouse group names with education-focused names
    - `backend/scripts/digital_literacy_demo_seed.py` — updated group naming pattern
  - **New Documentation:** Created `.context/operations/mock_data_policy.md` with:
    - Prohibited topics (warehouse, logistics, retail, manufacturing, corporate HR)
    - Approved topics (digital literacy, online services, safety, daily life services)
    - Naming conventions for groups, courses, users
    - Enforcement checklist for new mock data
  - **Before:** РЦ Запад, Склад Юг/Север, Смена А/Б
  - **After:** Группа "Цифровой Старт", "Серебряный Возраст", "Активное Долголетие", "Мудрость Поколений"
- **Validation:**
  - Grep search confirms zero warehouse terms in mock data files
  - All group names now follow education-focused pattern
  - Policy document created to prevent future violations

---

## Entry: 2026-04-01 (groups & assignments MVP-1 implementation)
- Date: 2026-04-01
- Task: Реализовать MVP-1 для раздела `Группы и назначения` (группы, участники, назначения курсов на группы) и подключить UI в web-admin.
- Decision/Change:
  - Planning/context:
    - Добавлен документ с зафиксированным scope: `.context/planning/groups_assignments_mvp.md`.
    - В `current_focus.md` добавлен статус старта реализации Groups & Assignment MVP-1.
  - Backend:
    - Добавлен новый модуль `backend/app/modules/groups/`:
      - `infra/models.py`: `groups`, `group_memberships`, `group_course_assignments`.
      - `infra/repository.py`: CRUD групп, bulk membership replace, list/create/update assignments.
      - `domain/services.py`, `domain/errors.py`.
      - `api/schemas.py`, `api/router.py`.
    - Добавлены endpoint'ы:
      - `GET/POST /api/v1/groups`,
      - `PATCH /api/v1/groups/{group_id}`,
      - `POST /api/v1/groups/{group_id}/archive|restore`,
      - `GET/PUT /api/v1/groups/{group_id}/members`,
      - `GET /api/v1/groups/users`,
      - `GET/POST /api/v1/groups/{group_id}/assignments`,
      - `PATCH /api/v1/groups/{group_id}/assignments/{assignment_id}`.
    - Подключение:
      - DI: `GroupsServiceDep` в `app/shared/di/services.py`.
      - API router include в `app/api/router.py`.
      - model registry обновлен в `app/models.py`.
    - RBAC:
      - fallback policy map дополнен `groups.view`/`groups.manage`.
    - Migration:
      - `backend/migrations/versions/0013_add_groups_and_group_assignments.py`.
      - создаёт таблицы groups/memberships/assignments и сидит policy rules для групп.
    - Tests:
      - добавлены `backend/tests/test_groups_service.py`.
      - добавлены `backend/tests/test_groups_api_router_branches.py`.
  - Web admin:
    - Добавлена страница `web/app/groups/page.tsx` + стили `web/app/groups/groups.module.css`.
    - Dashboard tile `Groups and Assignment` теперь ведёт на `/groups`.
    - Добавлен feature-модуль `web/src/features/groups/`:
      - `types.ts`, `api.ts`.
      - client workspace: `components/groups-workspace.tsx` + CSS.
    - Добавлены admin proxy routes `web/app/api/admin/groups/**` для всех операций MVP-1.
- Validation:
  - `cd backend && ruff check app/modules/groups app/shared/di/services.py app/api/router.py app/models.py app/shared/auth/policies.py tests/test_groups_service.py tests/test_groups_api_router_branches.py` -> passed.
  - `cd web && npx eslint app/groups/page.tsx src/features/groups/api.ts src/features/groups/types.ts src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> failed из-за pre-existing ошибок вне текущего scope (`CourseBuilderHeader.tsx`, `MobilePreview.tsx`).
  - `cd backend && PYTHONPATH=. pytest tests/test_groups_service.py tests/test_groups_api_router_branches.py` -> failed из-за недоступной test DB (`127.0.0.1:5433`, connection refused).

## Entry: 2026-04-01 (follow-up verification and environment checks)
- Date: 2026-04-01
- Task: Продолжить шаги после MVP-1: применить миграцию, повторить проверки и устранить блокирующие type-check ошибки фронтенда.
- Decision/Change:
  - Попытка применить миграции:
    - `cd backend && python3 -m alembic upgrade head` -> не выполнено из-за недоступной PostgreSQL на `localhost:5433`.
  - Диагностика окружения:
    - `make doctor` подтвердил проблему доступа к БД (`connection refused`) и недоступность docker daemon.
  - Устранены pre-existing TypeScript ошибки вне groups-секции:
    - `web/src/features/course-builder/ui/CourseBuilderHeader.tsx` — безопасный optional access для `lastSavedAt`.
    - `web/src/features/course-builder/ui/preview/MobilePreview.tsx` — корректная типизация `quiz.questions`.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npx eslint src/features/course-builder/ui/CourseBuilderHeader.tsx src/features/course-builder/ui/preview/MobilePreview.tsx` -> passed.

## Entry: 2026-04-01 (db port fallback + migration/test completion)
- Date: 2026-04-01
- Task: Завершить миграции и backend-проверки для Groups MVP-1 в окружении без docker daemon.
- Decision/Change:
  - Обнаружено, что локальный PostgreSQL доступен на `127.0.0.1:5432`, а не на `5433`.
  - Миграции прогнаны через временный override `APP_DATABASE_URL` на порт `5432`.
  - Исправлен идентификатор миграции (`revision`) на короткий формат:
    - было: `0013_add_groups_and_group_assignments` (слишком длинно для `alembic_version.version_num`),
    - стало: `0013_groups_assignments`.
  - Исправлены backend route paths groups-модуля:
    - было двойное префиксирование (`/groups/groups/...`),
    - стало корректно с `prefix='/groups'` + локальные пути (`/`, `/{group_id}/...`).
- Validation:
  - `cd backend && APP_DATABASE_URL=postgresql+psycopg://app:app@127.0.0.1:5432/app python3 -m alembic upgrade head` -> passed.
  - `cd backend && APP_DATABASE_URL=postgresql+psycopg://app:app@127.0.0.1:5432/app python3 -m alembic current` -> `0013_groups_assignments (head)`.
  - `cd backend && TEST_DATABASE_URL=postgresql+psycopg://app:app@127.0.0.1:5432/app PYTHONPATH=. pytest tests/test_groups_service.py tests/test_groups_api_router_branches.py` -> passed (5 passed).

## Entry: 2026-04-01 (groups MVP-2 individual targets)
- Date: 2026-04-01
- Task: Добавить индивидуальные назначения пользователей поверх группового assignment flow.
- Decision/Change:
  - Backend:
    - Добавлена модель `GroupCourseAssignmentTargetUser` и её регистрация в `app/models.py`.
    - Repository расширен:
      - `list_assignment_target_user_ids()`
      - `replace_assignment_target_users()`
    - API схемы расширены:
      - `GroupAssignmentCreateIn.target_user_ids`
      - `GroupAssignmentUpdateIn.target_user_ids`
      - `GroupAssignmentOut.target_user_ids` + `target_users_count`
    - Service:
      - в create/update assignment добавлена валидация active users и сохранение target users.
    - Router:
      - assignment responses теперь возвращают target user ids/count.
  - Migration:
    - Добавлена `0014_assignment_target_users.py`.
    - Создает `group_course_assignment_target_users` + индексы + unique constraint.
    - Обнаружен локальный environment drift: в текущей БД `alembic_version` указывает `0013`, но таблицы groups отсутствуют, из-за чего `0014` не может примениться (FK на `group_course_assignments`).
  - Frontend:
    - `web/src/features/groups/types.ts` и `api.ts` обновлены под `target_user_ids`/`target_users_count`.
    - В `groups-workspace.tsx` добавлен выбор индивидуальных пользователей при создании assignment.
    - Добавлено редактирование индивидуальных целей у уже созданного assignment.
    - В списке assignment показывается счетчик индивидуальных целей.
  - Tests:
    - Добавлен unit-тест `test_create_group_assignment_rejects_inactive_target_users`.
- Validation:
  - `cd backend && ruff check app/modules/groups app/models.py migrations/versions/0014_assignment_target_users.py tests/test_groups_api_router_branches.py tests/test_groups_service.py` -> passed.
  - `cd backend && TEST_DATABASE_URL=postgresql+psycopg://app:app@127.0.0.1:5432/app PYTHONPATH=. pytest tests/test_groups_service.py tests/test_groups_api_router_branches.py` -> passed (6 passed).
  - `cd web && npx eslint src/features/groups/api.ts src/features/groups/types.ts src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

Additional environment note:
- Attempt to run alembic `0014` against local `5432/app` currently fails because that DB does not contain prerequisite base tables (e.g. `users`) and is not a fully initialized project schema.

## Entry: 2026-04-01 (progress operational view)
- Date: 2026-04-01
- Task: Реализовать экран `Progress` (операционный обзор) с фильтрами group/course/user и метриками completion.
- Decision/Change:
  - Backend:
    - Добавлен модуль `progress`:
      - `infra/models.py` (`lesson_progress`),
      - `infra/repository.py` (агрегация assignment targets + completion),
      - `domain/services.py`, `domain/errors.py`,
      - `api/schemas.py`, `api/router.py`.
    - Новые API:
      - `GET /api/v1/progress/overview` (filters: `group_id`, `course_id`, `user_id`),
      - `POST /api/v1/progress/lesson` (upsert lesson progress).
    - Подключение:
      - `app/api/router.py` include `progress` router,
      - DI: `ProgressServiceDep`,
      - `app/models.py` включает `LessonProgress`.
    - RBAC fallback policy map дополнен `progress.view`.
    - Добавлена миграция `0015_progress_tracking.py` (`lesson_progress` + seed `progress.view`).
    - Добавлены router tests: `backend/tests/test_progress_api_router_branches.py`.
  - Frontend:
    - Добавлены `web/src/features/progress/types.ts` и `web/src/features/progress/api.ts`.
    - Добавлена страница `web/app/progress/page.tsx` + `progress.module.css`.
    - Dashboard получил отдельный tile `Progress` с переходом на `/progress`.
    - На странице прогресса реализованы:
      - фильтры по группе/курсу/пользователю,
      - таблица с completed/total lessons и completion %.
- Validation:
  - `cd backend && ruff check app/modules/progress app/api/router.py app/shared/di/services.py app/shared/auth/policies.py app/models.py tests/test_progress_api_router_branches.py` -> passed.
  - `cd backend && TEST_DATABASE_URL=postgresql+psycopg://app:app@127.0.0.1:5432/app PYTHONPATH=. pytest tests/test_progress_api_router_branches.py tests/test_groups_service.py tests/test_groups_api_router_branches.py` -> passed (8 passed).
  - `cd web && npx eslint app/progress/page.tsx src/features/progress/api.ts src/features/progress/types.ts app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (progress mock seeding utility)
- Date: 2026-04-01
- Task: Добавить утилиту наполнения `lesson_progress`, чтобы быстро проверять страницу Progress на тестовых данных.
- Decision/Change:
  - Добавлен скрипт `backend/scripts/progress_mocks.py` (commands: `seed|cleanup|reset`).
  - Логика seed:
    - берет назначения из groups module,
    - формирует target users как `group members + assignment target users`,
    - заполняет `lesson_progress` по урокам курса с детерминированным pseudo-random completion профилем.
  - Логика cleanup:
    - удаляет только progress-строки для уроков назначенных курсов и вычисленных target users.
  - Добавлен fail-safe:
    - если схема БД неполная/не готова, скрипт не падает, а пишет `skipped`.
  - Добавлены Make targets:
    - `make progress-mocks`
    - `make progress-mocks-clean`
    - `make progress-mocks-reset`
- Validation:
  - `cd backend && ruff check scripts/progress_mocks.py` -> passed.
  - `make progress-mocks` -> executes, prints schema-not-ready skip in текущем локальном DB (`5432/app`).

## Entry: 2026-04-01 (local DB full re-initialization)
- Date: 2026-04-01
- Task: Полностью инициализировать локальную БД, устранить migration drift и привести схему к текущему `head`.
- Decision/Change:
  - Выполнен reset схемы `public` в локальной БД `postgresql+psycopg://app:app@127.0.0.1:5432/app`:
    - `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
  - После reset выполнен полный прогон миграций:
    - `alembic upgrade head` с `APP_DATABASE_URL` на `5432`.
- Validation:
  - `alembic current` -> `0015_progress_tracking (head)`.
  - Проверка наличия ключевых таблиц (`users`, `courses`, `groups`, `group_course_assignments`, `group_course_assignment_target_users`, `lesson_progress`, `rbac_policy_rules`) -> все присутствуют.
  - `make progress-mocks` -> больше не падает по схеме, сообщает корректно: `no assignment targets found` (данные не сидированы).

## Entry: 2026-04-01 (demo data bootstrap for groups/progress UI)
- Date: 2026-04-01
- Task: Подготовить полностью рабочий демо-набор данных для `/groups` и `/progress` после инициализации БД.
- Decision/Change:
  - Добавлен script `backend/scripts/ops_demo_seed.py` (`seed|cleanup|reset`):
    - создает demo users (admin/moderator/users) с логинами `demo_ops_*`,
    - создает demo courses (`ops-demo-*`) и lessons,
    - создает demo groups (`Demo Ops*`) и memberships,
    - создает group assignments + individual target users,
    - запускает `progress_mocks.seed()` для заполнения `lesson_progress`.
  - Makefile дополнен командами:
    - `make ops-demo-seed`
    - `make ops-demo-clean`
    - `make ops-demo-reset`
  - Исправлен `progress_mocks.py`:
    - основной seed-блок возвращен внутрь `SessionLocal.begin()` transaction scope,
    - финальный счетчик now prints once per run (no per-assignment duplicate output).
  - Улучшена логика `ops_demo_seed.py reset`:
    - убран двойной cleanup.
- Validation:
  - `cd backend && ruff check scripts/progress_mocks.py scripts/ops_demo_seed.py` -> passed.
  - `make ops-demo-reset` -> passed.
  - Проверка counts в БД (`APP_DATABASE_URL=...5432/app`):
    - demo users: 7,
    - demo courses: 2,
    - demo groups: 2,
    - assignments: 2,
    - assignment target users: 2,
    - lesson_progress rows: 28.

## Entry: 2026-04-01 (heavy demo profile for load-like UI checks)
- Date: 2026-04-01
- Task: Подготовить расширенный demo-профиль данных для проверки фильтров/таблиц на большом наборе в `/groups` и `/progress`.
- Decision/Change:
  - `backend/scripts/ops_demo_seed.py` расширен профилями:
    - `--profile normal` (default),
    - `--profile heavy`.
  - Для `heavy` генерируются:
    - 62 demo users (admin/mod + 60 пользователей),
    - 6 курсов по 6 уроков,
    - 6 групп,
    - 12 assignments,
    - 60 individual assignment targets.
  - `Makefile` дополнен командами:
    - `make ops-demo-heavy-seed`
    - `make ops-demo-heavy-reset`
  - Исправлен `progress_mocks.py`:
    - предотвращены дубликаты `(user_id, lesson_id)` в одной транзакции при множественных assignment-target пересечениях.
- Validation:
  - `cd backend && ruff check scripts/progress_mocks.py scripts/ops_demo_seed.py` -> passed.
  - `make ops-demo-heavy-reset` -> passed.
  - Проверка counts после heavy reset:
    - users: 62,
    - courses: 6,
    - groups: 6,
    - assignments: 12,
    - target users: 60,
    - lesson_progress: 1446.

## Entry: 2026-04-01 (groups/progress UX clarity + full Russian locale)
- Date: 2026-04-01
- Task: Сделать интерфейс `Группы и назначения` и `Прогресс` более понятным и полностью русскоязычным.
- Decision/Change:
  - Groups UI (`groups-workspace.tsx/.module.css`):
    - введены вкладки: `Обзор`, `Участники`, `Назначения`;
    - добавлен явный status badge группы (`Активна/Архив`);
    - добавлены короткие подсказки по шагам и по каждому разделу;
    - тексты/кнопки/ошибки переведены на русский.
  - Progress UI (`progress/page.tsx`, `progress.module.css`):
    - тексты полностью русские;
    - добавлен dashboard-блок с KPI карточками;
    - добавлены графики (горизонтальные bar charts):
      - распределение по статусам назначений,
      - топ групп по выполнению.
  - Demo seed RU:
    - `ops_demo_seed.py` переведен на русские названия пользователей/групп/курсов/уроков;
    - credentials output переведен на русский;
    - heavy profile сохраняется.
- Validation:
  - `cd web && npx eslint app/progress/page.tsx src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.
  - `cd backend && ruff check scripts/ops_demo_seed.py` -> passed.
  - `make ops-demo-heavy-reset` -> passed.
  - проверка примеров данных в БД показывает русские имена групп/курсов.

## Entry: 2026-04-01 (final RU UX pass for Groups/Progress)
- Date: 2026-04-01
- Task: Дожать UX до максимально понятного и дружелюбного вида с русскими статусами и консистентными текстами.
- Decision/Change:
  - `web/app/groups/page.tsx`:
    - убраны англоязычные fallback-тексты, заголовок/описание/кнопки унифицированы на русском,
    - обновлен нижний helper-текст под текущую логику (групповые + индивидуальные назначения).
  - `web/src/features/groups/components/groups-workspace.tsx`:
    - добавлены русские label-функции для:
      - статуса назначения (`Черновик`, `Запланировано`, `Активно`, `Завершено`, `Отменено`),
      - политики старта (`Сразу`, `По расписанию`),
    - в селекте статуса назначения показаны русские опции.
  - `web/app/progress/page.tsx`:
    - график распределения статусов теперь отображает русские подписи статусов.
- Validation:
  - `cd web && npx eslint app/groups/page.tsx app/progress/page.tsx src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (minimal friendly UX refinement: groups/progress)
- Date: 2026-04-01
- Task: Сделать экраны `Группы и назначения` и `Прогресс` более понятными и дружелюбными по best-practices (plain language, low cognitive load, clear status semantics).
- Decision/Change:
  - Groups workspace:
    - введен локальный форматтер дат `dd.mm.yyyy hh:mm`;
    - добавлены пустые состояния:
      - для участников (нет доступных пользователей),
      - для назначений (пока нет назначений);
    - улучшена форма назначения:
      - добавлены подписи к полям даты (`Начало`, `Окончание`),
      - мета assignment оформлена как компактные чипы/лейблы;
    - статус назначения визуализирован цветным чипом (`Черновик`, `Запланировано`, `Активно`, `Завершено`, `Отменено`).
  - Progress dashboard:
    - добавлены недостающие стили для `status` и `progress` чипов;
    - добавлен дружелюбный фильтр-чекбокс для отстающих;
    - добавлена подсветка строк отстающих (<50%).
- Files:
  - `web/src/features/groups/components/groups-workspace.tsx`
  - `web/src/features/groups/components/groups-workspace.module.css`
  - `web/app/progress/progress.module.css`
- Validation:
  - `cd web && npx eslint app/groups/page.tsx app/progress/page.tsx src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (domain correction: digital literacy for seniors)
- Date: 2026-04-01
- Task: Перевести демо-данные и формулировки из операционного контекста в домен обучения цифровой грамотности пенсионеров.
- Decision/Change:
  - `backend/scripts/ops_demo_seed.py`:
    - обновлены названия групп на клубный/учебный контекст (например, `Клуб Северный — Утро`),
    - обновлены названия курсов на digital literacy тематику (`Смартфон`, `Госуслуги`, `Безопасность в интернете` и т.д.),
    - обновлены описания групп/курсов под образовательный контекст,
    - сохранены человеческие ФИО-стиль display names.
  - UI тексты:
    - `web/app/progress/page.tsx`: subtitle изменен на нейтральный образовательный (`Обзор прогресса обучения...`).
    - `web/app/dashboard/page.tsx`: описание tile `Прогресс` синхронизировано с образовательным контекстом.
  - Данные пересидированы:
    - выполнен `make ops-demo-heavy-reset`.
- Validation:
  - Проверка sample row в БД после reseed: пример вида `('Клуб Восточный — Базовый', 'Безопасность в интернете', 'Беляева Вера')`.
  - `cd web && npx eslint app/progress/page.tsx app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (seed tooling rename + human-readable naming)
- Date: 2026-04-01
- Task: Убрать остатки старого naming и сделать демо-названия максимально «человеческими».
- Decision/Change:
  - Script renamed:
    - `backend/scripts/ops_demo_seed.py` -> `backend/scripts/digital_literacy_demo_seed.py`.
  - Make targets renamed:
    - `literacy-demo-seed|clean|reset`
    - `literacy-demo-heavy-seed|reset`
    - старые `ops-demo-*` оставлены как backward-compatible aliases.
  - Улучшен cleanup в сидере:
    - удаляет demo-группы не только по старому префиксу, но и по связям demo users/courses и `Клуб %`.
  - Улучшены сообщения script output на русском.
- Validation:
  - `cd backend && ruff check scripts/digital_literacy_demo_seed.py` -> passed.
  - `make literacy-demo-heavy-reset` -> passed.
  - sample rows в БД подтверждают human-friendly naming (клубы/курсы/ФИО).

## Entry: 2026-04-01 (language switch moved into settings)
- Date: 2026-04-01
- Task: Убрать языковой тумблер с рабочих экранов и перенести переключение языка в отдельный пункт настроек.
- Decision/Change:
  - Создан новый экран `web/app/settings/page.tsx` + `web/app/settings/settings.module.css`.
  - На `settings` добавлен блок `Язык интерфейса` с явным выбором RU/EN.
  - Тумблер `LanguageSwitch` удален с основных рабочих страниц:
    - `dashboard`, `catalog`, `groups`, `progress`.
  - На рабочих страницах вместо тумблера добавлена кнопка `Настройки`.
  - На `dashboard` добавлена отдельная плитка `Настройки`.
  - `auth` экран оставлен с `LanguageSwitch` (чтобы язык можно было выбрать до входа в систему).
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx app/catalog/page.tsx app/groups/page.tsx app/progress/page.tsx app/settings/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (settings button position tweak)
- Date: 2026-04-01
- Task: Перенести кнопку `Настройки` в правый верхний угол рабочего стола.
- Decision/Change:
  - `web/app/dashboard/dashboard.module.css`:
    - `topBar` возвращен к двухколоночной схеме (`content + actions`),
    - `topActions` выровнен вправо (`justify-content: flex-end`).
- Result:
  - На desktop кнопка `Настройки` снова в правом верхнем углу,
  - На узких экранах остается адаптивное поведение (внизу/слева по media rules).

## Entry: 2026-04-01 (dashboard UX refactor: no tiles, settings icon)
- Date: 2026-04-01
- Task: Упростить UX главной страницы: убрать плитки и оставить настройки как иконку в правом верхнем углу.
- Decision/Change:
  - `web/app/dashboard/page.tsx`:
    - удален карточный (tiles) layout,
    - рабочие разделы отображаются как компактный вертикальный список строк (title + description + action),
    - удалена отдельная плитка `Настройки`,
    - кнопка `Настройки` в top-right заменена на icon-only action.
  - `web/app/dashboard/dashboard.module.css`:
    - добавлен стиль `settingsIconLink`,
    - добавлены styles для нового list-first layout (`sectionsPanel`, `sectionList`, `sectionRow`, `sectionSoon`, ...),
    - удалены зависимости от card-grid визуальной модели.
  - Language switch policy:
    - `LanguageSwitch` оставлен только на `/auth`,
    - на рабочих экранах переход в `/settings`.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx app/catalog/page.tsx app/groups/page.tsx app/progress/page.tsx app/settings/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (dashboard split layout: left sections, right content)
- Date: 2026-04-01
- Task: Перестроить рабочий стол в layout `слева разделы / справа основной контент` вместо карточной сетки.
- Decision/Change:
  - `web/app/dashboard/page.tsx`:
    - список разделов вынесен в левый sidebar,
    - справа добавлен основной контент с фокусом на первичный раздел,
    - добавлены `Быстрые переходы` для следующих доступных разделов.
  - `web/app/dashboard/dashboard.module.css`:
    - добавлены стили split-layout (`workspaceSplit`, `sectionsSidebar`, `mainPanel`),
    - добавлены стили для навигации sidebar (`sidebarList`, `sidebarLink`, `sidebarMeta`),
    - добавлены стили для правой колонки (`primaryTitle`, `primaryDescription`, `quickActions`).
  - UX эффект:
    - меньше визуального шума,
    - понятная навигация слева,
    - рабочий фокус справа.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (header micro-polish follow-up)
- Date: 2026-04-01
- Task: Добить micro-polish Course Builder header после предыдущей итерации.
- Decision/Change:
  - В `CourseBuilderHeader.module.css`:
    - улучшена композиция title-row (чуть больше gap, мягче hover у back-кнопки);
    - блок описания переведен в `fit-content` с безопасным max-width, чтобы не растягивать левую часть шапки;
    - статусный badge сделан чуть более читаемым (вес/треккинг/высота);
    - action buttons унифицированы по высоте (`min-height: 32px`);
    - state-row выравнен вправо на desktop;
    - на `<=1200px` действия в шапке выравниваются влево для более естественного потока.
- Why:
  - Снизить визуальный шум и убрать ощущение «ломающейся» шапки на разных ширинах без перестройки логики компонента.

## Entry: 2026-04-01 (catalog rhythm polish + builder header softening)
- Date: 2026-04-01
- Task: Продолжить UX-полиш каталога и сделать header Course Builder более спокойным визуально.
- Decision/Change:
  - Catalog:
    - В `catalog-release-list.tsx` переразложена мета релиза: `Опубликован` оставлен акцентом, `Создан + Экранов` объединены в компактную вторичную строку.
    - В `catalog.module.css` выровнены высоты control-элементов header/actions до общего ритма (`30px`): edit/status/delete/menu/meta chips.
    - Подтянут вертикальный ритм release-card: уменьшены gaps/отступы и плотность meta-текста для более ровного сканирования списка.
  - Course Builder header:
    - В `CourseBuilderHeader.module.css` смягчен визуальный вес back-кнопки.
    - Уточнены отступы и ширина блока описания (`descriptionInline`), чтобы заголовок меньше «ломался» при длинных названиях.
    - Цвет текста описания слегка усилен по контрасту.
- Validation:
  - `cd web && npx eslint src/features/catalog/components/catalog-release-list.tsx` -> passed.

## Entry: 2026-04-01 (editor green underline hardening)
- Date: 2026-04-01
- Task: Убрать оставшийся визуальный артефакт в RichTextEditor (зелёная/грамматическая линия при фокусе).
- Decision/Change:
  - В `RichTextEditor.tsx` добавлен post-init hardening через `editor.view.dom`:
    - повторно выставляются `spellcheck=false`, `autocorrect=off`, `autocapitalize=off`, `autocomplete=off`;
    - дополнительно дублируются `data-gramm*`/`data-enable-grammarly=false`.
  - В `RichTextEditor.module.css` добавлены WebKit-специфичные suppress-правила:
    - `::-webkit-spelling-error`, `::-webkit-grammar-error` -> `text-decoration: none`.
- Why:
  - Предыдущие правки были недостаточны в ряде окружений (браузер/расширения), поэтому добавлен второй уровень защиты на DOM-атрибутах и движок-специфичных псевдо-элементах.
- Validation:
  - `cd web && npx eslint src/features/course-builder/ui/content/RichTextEditor.tsx` -> passed.

## Entry: 2026-04-01 (publish auto-check + lesson delete fix + catalog spacing)
- Date: 2026-04-01
- Task: По фидбеку пользователя убрать ручную кнопку проверки в publish-диалоге, включить автопроверку и починить удаление урока; стабилизировать вертикальные отступы каталога.
- Decision/Change:
  - Course Builder / Publish:
    - В `PublishDialog` проверка теперь запускается автоматически при открытии/обновлении структуры курса.
    - Удалена кнопка `Проверить` из блока "Валидация"; оставлен автоматический статус и список проблем.
    - `runValidation` переведен на `useCallback`, `useEffect` синхронизирован по зависимостям.
    - В `store.publish(...)` и `store.rollback(...)` ошибки теперь пробрасываются наверх после записи в store (чтобы модалка не закрывалась как при успехе).
  - Course Builder / Delete:
    - Исправлен вызов удаления урока в `LessonNode`: передавался неверный набор аргументов в `requestDelete`, из-за чего урок не удалялся.
  - Catalog layout:
    - В `catalog.module.css` добавлены `align-items: start` для `.workspace` и `align-content: start` для `.content`, чтобы карточки справа не растягивались из-за высоты сайдбара.
- Why:
  - Упростить UX публикации (без ручного шага "Проверить"), исключить ложное ощущение успешной публикации при backend-ошибке, и убрать визуальное "плавание" правой колонки каталога.
- Validation:
  - `cd web && npx eslint app/catalog/page.tsx src/features/course-builder/ui/publish/PublishDialog.tsx src/features/course-builder/ui/sidebar/LessonNode.tsx src/features/course-builder/store.ts` -> passed.

## Entry: 2026-04-01 (catalog action icons)
- Date: 2026-04-01
- Task: По UX-запросу заменить текстовые action-элементы каталога на вариант с иконками.
- Decision/Change:
  - В `web/app/catalog/page.tsx` добавлены inline SVG-иконки для:
    - `+ Создать курс`, `Панель`, `Редактировать курс`,
    - `Применить`, `Сбросить`,
    - кнопки архивирования/восстановления (через `CourseStatusToggleButton`).
  - В `web/src/features/catalog/components/course-status-toggle-button.tsx` добавлена поддержка иконки и layout-классов.
  - В `web/app/catalog/catalog.module.css` добавлены общие классы `actionContent` / `actionIcon`.
- Validation:
  - `cd web && npx eslint app/catalog/page.tsx src/features/catalog/components/course-status-toggle-button.tsx` -> passed.

## Entry: 2026-04-01 (archived-only hard delete + auto version bump)
- Date: 2026-04-01
- Task: Разрешить полное удаление только для архивных курсов и убрать ручной ввод версии при публикации.
- Decision/Change:
  - Backend:
    - Добавлен `DELETE /api/v1/catalog/courses/{course_id}`.
    - В `CatalogService.delete_course(...)` добавлена бизнес-проверка: удалять можно только `status=archived`, иначе `409`.
    - В `CatalogRepository` добавлен `delete_course(...)`.
    - При успешном удалении также удаляется файл обложки курса (если есть).
    - Добавлены тесты на сервисный сценарий удаления и ветки router для DELETE.
  - Web:
    - Proxy route `web/app/api/admin/catalog/courses/[courseId]/route.ts` расширен `DELETE`.
    - Добавлен `deleteCourse(...)` helper в `web/src/features/catalog/api.ts`.
    - Добавлена кнопка `Удалить курс` (только для archived) в header каталога.
    - Исправлен UX кнопки создания курса: убран дублирующий `+` в тексте (иконка остается).
  - Publish dialog:
    - Поле версии сделано auto-generated и read-only.
    - Следующая версия рассчитывается автоматически как patch bump от последнего релиза.
    - Добавлен hint "Версия формируется автоматически".
- Validation:
  - `cd backend && ruff check app/modules/catalog/api/router.py app/modules/catalog/domain/services.py app/modules/catalog/infra/repository.py tests/test_catalog_course_update.py tests/test_catalog_api_router_branches.py` -> passed.
  - `cd web && npx eslint app/catalog/page.tsx src/features/catalog/api.ts src/features/catalog/components/course-status-toggle-button.tsx src/features/catalog/components/course-delete-button.tsx src/features/course-builder/ui/publish/PublishDialog.tsx` -> passed.

## Entry: 2026-04-01 (publish version conflict hardening)
- Date: 2026-04-01
- Task: Исправить проблему, когда версия в publish-диалоге не увеличивается автоматически и публикация падает из-за конфликта версии.
- Decision/Change:
  - В `PublishDialog` переработан расчет следующей версии:
    - теперь версия считается по максимуму среди всех release `x.y.z` (а не по первому элементу списка),
    - затем делается patch-bump (`+1` к patch).
  - Добавлен `loadNextVersion()` с повторным получением актуального списка версий.
  - В `handlePublish()` добавлен retry-сценарий для version-conflict (`409` / `already exists`):
    - диалог запрашивает актуальную следующую версию,
    - обновляет поле версии,
    - повторяет публикацию автоматически один раз.
- Validation:
  - `cd web && npx eslint src/features/course-builder/ui/publish/PublishDialog.tsx` -> passed.

## Entry: 2026-04-01 (publish version source fix)
- Date: 2026-04-01
- Task: Исправить ситуацию, когда при редактировании существующего курса в publish-диалоге всегда остается `1.0.0`.
- Root cause:
  - Route `web/app/api/admin/catalog/courses/[courseId]/releases/route.ts` поддерживал только `POST`; `GET` для чтения релизов отсутствовал.
  - PublishDialog запрашивал `GET /api/admin/catalog/courses/{id}/releases`, получал ошибку, и откатывался на `1.0.0`.
- Decision/Change:
  - Добавлен `GET` handler в releases route с проксированием на backend `/catalog/courses/{courseId}/releases` и пробросом query-параметров.
- Validation:
  - `cd web && npx eslint app/api/admin/catalog/courses/[courseId]/releases/route.ts src/features/course-builder/ui/publish/PublishDialog.tsx` -> passed.

## Entry: 2026-04-01 (publish dialog scroll + rollback wording)
- Date: 2026-04-01
- Task: Исправить прокрутку модального окна публикации и обновить формулировки rollback действия.
- Decision/Change:
  - В `PublishDialog` тексты rollback заменены:
    - кнопка `Откатить` -> `Вернуть`,
    - `Откат...` -> `Возврат...`,
    - fallback сообщение `Ошибка отката` -> `Ошибка возврата`.
  - В `PublishDialog.module.css` исправлен скролл модалки:
    - overlay выравнивание `flex-start` вместо `center`,
    - увеличены безопасные отступы сверху/снизу,
    - скорректирован `max-height` диалога,
    - добавлен `-webkit-overflow-scrolling: touch` для плавного скролла тела.

## Entry: 2026-04-01 (return without creating new release)
- Date: 2026-04-01
- Task: Изменить поведение кнопки "Вернуть", чтобы не создавалась новая версия релиза.
- Decision/Change:
  - Backend rollback logic обновлена:
    - `CatalogService.rollback_course(...)` больше не создает новый release.
    - Теперь операция переиспользует выбранный release: обновляет `published_at` и оставляет ту же версию.
    - Параметры `version/changelog` в rollback временно игнорируются для обратной совместимости API payload.
  - API contract:
    - `POST /courses/{course_id}/rollback` теперь возвращает `200` (ранее `201`), так как новый ресурс не создается.
  - Tests:
    - `test_rollback_creates_new_release` обновлен в `test_rollback_reuses_existing_release` с новыми ожиданиями (без версии `1.0.1`).
- Validation:
  - `cd backend && ruff check app/modules/catalog/domain/services.py app/modules/catalog/api/router.py tests/test_course_builder_flow.py` -> passed.

## Entry: 2026-04-01 (return restores builder structure)
- Date: 2026-04-01
- Task: После `Вернуть` в Course Builder отображались старые значения; нужно реально восстановить контент выбранного релиза.
- Decision/Change:
  - Backend rollback logic расширена:
    - при `rollback_course(...)` теперь очищается текущая структура уроков курса,
    - структура пересобирается из screen snapshot выбранного release (уроки + блоки + payload),
    - версия release не создается заново (ранее уже изменено), но данные курса действительно возвращаются к выбранной версии.
  - Repository:
    - добавлен `delete_lesson(...)` для удаления уроков перед восстановлением.
  - Web store:
    - после успешного `rollback` Course Builder теперь делает `fetchCourseStructure(...)` и обновляет состояние, чтобы сразу показать восстановленные значения в UI.
- Validation:
  - `cd backend && ruff check app/modules/catalog/domain/services.py app/modules/catalog/infra/repository.py` -> passed.
  - `cd web && npx eslint src/features/course-builder/store.ts` -> passed.

## Entry: 2026-04-01 (catalog course cover stubs)
- Date: 2026-04-01
- Task: Добавить отображение обложек курсов в каталоге и fallback-stub для курсов без обложки.
- Decision/Change:
  - `CourseDto` расширен полем `cover_url`.
  - В `CatalogSidebar` добавлен блок обложки в карточке курса:
    - если `cover_url` есть -> показывается мини-обложка,
    - если обложки нет -> показывается stub с инициалами курса.
  - В `catalog.module.css` добавлены стили `courseHeadRow`, `courseCover`, `courseCoverStub`.
- Validation:
  - `cd web && npx eslint src/features/catalog/components/catalog-sidebar.tsx src/features/catalog/types.ts` -> passed.

## Entry: 2026-04-01 (catalog visual density: updated-at + description)
- Date: 2026-04-01
- Task: Сделать каталог менее пустым визуально, добавив полезные метаданные по курсам.
- Decision/Change:
  - В карточки курсов (sidebar) добавлены:
    - двухстрочный preview `description` (если есть),
    - дата/время последнего обновления (`updated_at`).
  - В header выбранного курса (справа от "Найдено версий") добавлен badge `Обновлен: ...`.
  - Добавлены соответствующие стили `courseDescription`, `courseUpdatedAt`, `metaSubtle`.
- Validation:
  - `cd web && npx eslint app/catalog/page.tsx src/features/catalog/components/catalog-sidebar.tsx` -> passed.

## Entry: 2026-04-01 (builder: separate description block)
- Date: 2026-04-01
- Task: Вынести описание курса в отдельный визуальный блок, чтобы header не выглядел перегруженным длинным текстом.
- Decision/Change:
  - В `CourseBuilderHeader` описание вынесено в отдельный card-like блок `Описание курса`.
  - В read-mode описание ограничено 3 строками (line clamp), редактирование открывается по клику на блок.
  - В edit-mode показывается textarea внутри того же блока (Cmd/Ctrl+Enter сохранить, Esc отмена).
- Validation:
  - `cd web && npx eslint src/features/course-builder/ui/CourseBuilderHeader.tsx src/features/course-builder/api.ts src/features/course-builder/store.ts` -> passed.

## Entry: 2026-04-01 (builder: description modal UX)
- Date: 2026-04-01
- Task: Упростить и разгрузить header билдера — длинное описание курса выглядело громоздко.
- Decision/Change:
  - Описание переведено в компактную inline-плашку (1 строка preview + кнопка `Редактировать`).
  - Редактирование вынесено в отдельное модальное окно с textarea и явными действиями `Отмена` / `Сохранить`.
  - Сохранены горячие клавиши: `Cmd/Ctrl+Enter` — сохранить, `Esc` — закрыть без сохранения.
- Validation:
  - `cd web && npx eslint src/features/course-builder/ui/CourseBuilderHeader.tsx` -> passed.

## Entry: 2026-04-01 (content editor UX polish)
- Date: 2026-04-01
- Task: Максимально улучшить UX контент-редактора в правой зоне (`урок -> блок`).
- Decision/Change:
  - Content area:
    - добавлен структурированный top area: breadcrumb-pill + title блока,
    - добавлены быстрые действия блока: `Дублировать блок` и `Удалить блок`.
  - Rich text editor:
    - toolbar разбита на логические группы,
    - иконки для link/unlink/image заменены на inline SVG (без emoji),
    - добавлен sticky toolbar с горизонтальным скроллом,
    - добавлен нижний metrics bar (`Слов`, `Символов`).
  - Исправлен артефакт с горизонтальной линией в тексте:
    - добавлен явный neutral-style для `hr` внутри ProseMirror.
- Validation:
  - `cd web && npx eslint src/features/course-builder/ui/content/ContentArea.tsx src/features/course-builder/ui/content/RichTextEditor.tsx` -> passed.

## Entry: 2026-04-01 (catalog UX polish follow-up)
- Date: 2026-04-01
- Task: Довести каталог по UX: улучшить группировку действий, фильтры и читабельность карточек версий/курсов.
- Decision/Change:
  - Header actions:
    - trigger `...` заменен на более явный `Действия` + chevron.
  - Filters:
    - placeholder версии изменен на подсказку `например, 1.0`,
    - добавлены chips активных фильтров (`Статус`, `Версия`) после применения.
  - Sidebar cards:
    - статус курса поднят в верхнюю строку рядом с названием (вместо отдельной нижней строки).
  - Release cards:
    - мета переразложена по акцентам: `Опубликован` как сильная строка, `Создан/Экранов` как вторичные.
- Validation:
  - `cd web && npx eslint app/catalog/page.tsx src/features/catalog/components/catalog-sidebar.tsx src/features/catalog/components/catalog-release-list.tsx` -> passed.

## Entry: 2026-04-01 (catalog course archive/restore action)
- Date: 2026-04-01
- Task: Добавить в каталоге понятный action для удаления курса из активного списка без hard-delete (архивирование).
- Decision/Change:
  - Backend catalog update:
    - `CourseUpdateIn` расширен полем `status` (`draft|active|archived`).
    - `CatalogService.update_course(...)` теперь прокидывает `status` в repository.
    - `CatalogRepository.update_course(...)` обновляет статус курса при PATCH.
  - Backend tests:
    - `backend/tests/test_catalog_course_update.py` обновлён под новый аргумент `status`.
    - Добавлен тест `test_update_course_status_only`.
  - Web catalog:
    - Добавлен клиентский toggle-компонент `CourseStatusToggleButton` в header выбранного курса.
    - Для выбранного курса теперь доступны действия: `Редактировать курс` + `Архивировать курс` (или `Восстановить курс` для archived).
    - Добавлен API helper `updateCourseStatus(...)` через `/api/admin/catalog/courses/{courseId}`.
- Why:
  - Пользовательский запрос "как удалять созданный курс" закрыт безопасным business-flow через архивирование/восстановление без необратимого удаления данных.
- Validation:
  - `cd backend && ruff check app/modules/catalog/api/schemas.py app/modules/catalog/domain/services.py app/modules/catalog/infra/repository.py tests/test_catalog_course_update.py` -> passed.
  - `cd web && npx eslint src/features/catalog/components/course-status-toggle-button.tsx src/features/catalog/api.ts app/catalog/page.tsx` -> passed.
  - `cd backend && PYTHONPATH=. pytest tests/test_catalog_course_update.py` -> не выполнен из-за недоступного test DB (`127.0.0.1:5433`, Connection refused).

## Entry: 2026-04-01 (course builder mock data script)
- Date: 2026-04-01
- Task: Добавить быстрый способ наполнить БД мок-курсами для ручной UX/UI проверки билдера.
- Decision/Change:
  - Добавлен скрипт: `backend/scripts/course_builder_mocks.py`
    - команды: `seed | cleanup | reset`
    - создаёт 2 курса:
      - `builder-demo-valid` (валидный сценарий)
      - `builder-demo-issues` (намеренно с ошибками для проверки валидации)
  - Добавлены make targets:
    - `make builder-mocks`
    - `make builder-mocks-clean`
    - `make builder-mocks-reset`
  - Для стабильного локального запуска targets используют `APP_DATABASE_URL` через `MOCK_DB_URL` (по умолчанию `5432`).
- Validation:
  - `make builder-mocks` успешно создал demo-курсы и вывел ссылки `/course-builder/{id}`.

## Entry: 2026-04-01 (cover management + release rollback)
- Date: 2026-04-01
- Task: Добавить управление обложкой курса и откат к предыдущему релизу в Course Builder.
- Decision/Change:
  - Backend API:
    - `POST /api/v1/catalog/courses/{course_id}/cover` — принимает JSON `{ filename, content_base64 }`, сохраняет файл обложки в `catalog_covers/<slug>.<ext>`.

## Entry: 2026-04-09 (course_builder_mocks FK registration)
- Date: 2026-04-09
- Task: Исправить локальный seed path для `make builder-mocks`.
- Decision/Change:
  - `backend/scripts/course_builder_mocks.py` теперь импортирует `app.modules.users.models.User` до seed/delete операций, чтобы SQLAlchemy видел таблицу `users` при обработке FK `courses.author_id -> users.id`.
  - Добавлен regression test `backend/tests/test_course_builder_mocks_script.py`, который запускает `python3 scripts/course_builder_mocks.py seed` в subprocess и проверяет успешный CLI path.
- Validation:
  - Regression test passed.
  - Direct CLI seed succeeded after schema priming and cleanup completed.
    - `DELETE /api/v1/catalog/courses/{course_id}/cover` — удаляет текущую обложку курса.
    - `POST /api/v1/catalog/courses/{course_id}/rollback` — создаёт новый published release как копию выбранного `release_id` с новой `version`.
  - Backend domain/repo:
    - `CatalogService.rollback_course(...)` реализован с валидацией принадлежности релиза курсу и проверкой уникальности версии.
    - `CatalogRepository.get_release_by_id(...)` добавлен для rollback-flow.
  - Web admin:
    - Добавлены proxy routes:
      - `web/app/api/admin/catalog/courses/[courseId]/cover/route.ts`
      - `web/app/api/admin/catalog/courses/[courseId]/rollback/route.ts`
    - Добавлены API функции:
      - `uploadCourseCover`, `removeCourseCover`, `rollbackCourse`, `listCourseReleases`.
    - В header билдера добавлены кнопки:
      - "Обложка" (загрузка изображения png/jpeg/webp как base64)
      - "Убрать" (удаление обложки)
    - В PublishDialog добавлен блок "История версий" с кнопкой "Откатить" для каждой версии.
    - В store добавлен `rollback(...)` action.
- Why:
  - Закрыть оставшиеся low-priority пункты по cover management и rollback без изменения DB-схемы.
- Validation:
  - `ruff check` по изменённым backend файлам — passed.
  - `npm run lint` в web — 0 errors, только pre-existing warnings.
  - `pytest tests/test_course_builder_flow.py` временно не выполнен: локальный test DB на `127.0.0.1:5433` недоступен (Connection refused).

## Entry: 2026-04-01 (replace course wizard with builder in UI)
- Date: 2026-04-01
- Task: Заменить старый Course Wizard на новый Course Builder как основной путь создания/редактирования курсов.
- Decision/Change:
  - `/course-wizard/[courseId]/page.tsx` — теперь делает `redirect` на `/course-builder/${courseId}` (серверный redirect, без клиентского JS).
  - `/course-builder/new/page.tsx` — новая страница создания курса: форма (название + описание), вызов `POST /api/admin/catalog/courses`, redirect на `/course-builder/{id}`.
  - `web/app/catalog/page.tsx` — кнопка "+ Создать курс" теперь ведёт на `/course-builder/new` вместо `/course-wizard/new`.
  - `web/src/features/course-builder/api.ts` — добавлена функция `createCourse()`.
  - Исправлены lint-ошибок в builder UI:
    - `RichTextEditor.tsx` — убран ref-антипаттерн (обновление `contentRef.current` в render).
    - `MobilePreview.tsx` — заменены `any` типы на `QuizQuestion` интерфейс.
    - `PublishDialog.tsx` — экранированы кавычки в JSX (`&quot;`).
- Why:
  - Builder заменяет Wizard как основной инструмент. Wizard остаётся как legacy-маршрут с редиректом для обратной совместимости.
- Validation:
  - `npm run lint` → 0 errors (10 pre-existing warnings).

## Entry: 2026-03-31 (pre-commit pytest smart mode)
- Date: 2026-03-31
- Task: Ускорить коммиты, не теряя базовую защиту качества.
- Decision/Change:
  - В `scripts/pre-commit.sh` добавлен режим запуска pytest через `PRECOMMIT_PYTEST_MODE`:
    - `smart` (default): тесты запускаются только для критических backend-путей или больших backend change sets.
    - `always`: всегда запускать pytest на commit.
    - `never`: пропускать pytest на commit.
  - `ruff` и web `prettier/lint-staged` остаются обязательными.
  - Документация обновлена в `README.md` и `.context/operations/workflow.md`.
- Why:
  - Полный `pytest` на каждый commit заметно тормозит итерации; smart-режим сохраняет баланс скорости и безопасности.
- Validation:
  - Локально проверено: hook корректно определяет режим и выводит причину запуска/пропуска pytest.

## Entry: 2026-03-31 (log rotation for background stack)
- Date: 2026-03-31
- Task: Снизить риск деградации локального окружения из-за разрастающихся логов в `.run/`.
- Decision/Change:
  - В `scripts/dev-stack.sh` добавлена ротация двух логов при `start`:
    - `.run/dev.log` -> `dev.<timestamp>.log`
    - `.run/codegraph-watch.log` -> `codegraph-watch.<timestamp>.log`
  - Добавлены лимиты и ретеншн через env:
    - `MAX_LOG_BYTES`, `MAX_LOG_ARCHIVES`
    - `MAX_CGC_LOG_BYTES`, `MAX_CGC_LOG_ARCHIVES`
  - README/runbook обновлены с описанием ротации.
- Why:
  - При длительной работе CodeGraph watcher и dev stack генерируют большие логи; без ротации это ухудшает DX и затрудняет диагностику.
- Validation:
  - `make restart` -> stack стартует, health `200/200`.
  - `make status` показывает оба лог-файла (`dev.log`, `codegraph-watch.log`).

## Entry: 2026-03-31 (stable local startup + doctor diagnostics)
- Date: 2026-03-31
- Task: Устранить нестабильность локального запуска (ошибка `users` table missing) и зафиксировать устойчивый workflow для агентов.
- Root cause:
  - В локальной БД встречалось состояние: `alembic_version=head`, но критические таблицы (`users`, `courses`, `course_lessons`, `lesson_tasks`) отсутствовали.
  - Это приводило к `500 Internal Server Error` на `/auth/login`.
- Decision/Change:
  - `run` усилен проверкой схемы после миграций:
    - проверяет наличие критических таблиц,
    - при расхождении автоматически пересоздает `public` schema,
    - повторно выполняет `alembic upgrade head` и проверяет повторно.
  - `start-dev.sh` переведен на стабильный wrapper к `./run` (единый источник правды для запуска).
  - Добавлен `make doctor` для быстрой диагностики среды:
    - postgres status,
    - backend health,
    - web HTTP status,
    - auth login smoke,
    - наличие критических таблиц.
  - В auth API добавлен понятный ответ `503` при ошибке схемы вместо глухого `500`.
- Why:
  - Снизить количество ручной диагностики и устранить повторяющиеся сбои запуска для команды и агентов.
- Validation:
  - `./run` поднимает stack и проходит schema check.
  - `make doctor` завершает все 5 проверок успешно.
  - `POST /api/v1/auth/login` возвращает `access_token` для `admin/admin12345`.

## Entry: 2026-03-31 (background dev stack control)
- Date: 2026-03-31
- Task: Упростить стабильный повседневный запуск/остановку локального стека без ручного управления процессами.
- Decision/Change:
  - Добавлен управляющий скрипт `scripts/dev-stack.sh` с командами:
    - `start`, `stop`, `restart`, `status`, `logs`.
  - Добавлены Make targets:
    - `make run-bg`, `make stop`, `make restart`, `make status`, `make dev-logs`.
  - README и runbook синхронизированы с новым workflow background режима.
- Why:
  - Снизить количество падений/зависаний от ручного запуска в отдельных терминалах,
    стандартизировать операционный путь для команды и агентов.
- Validation:
  - `make run-bg` поднимает стек в фоне.
  - `make status` показывает PID + HTTP health backend/web.
  - `make stop` корректно завершает фоновый `./run`.

## Entry: 2026-03-30 (stepik-like course builder phase 1 start)
- Date: 2026-03-30
- Task: Зафиксировать продуктовый контракт и начать реализацию Stepik-like конструктора `Course -> Lesson -> Task`.
- Decision/Change:
  - Зафиксирована спецификация в `.context/product/stepik_course_builder_spec.md`.
  - Backend catalog расширен новыми сущностями авторинга:
    - `CourseLesson` (`course_lessons`)
    - `LessonTask` (`lesson_tasks`)
    - enum-типы `LessonStatus`, `TaskType`
  - Добавлены API-контракты и роуты для lesson/task CRUD:
    - list/create/update/archive/restore/reorder lessons
    - list/create/update/archive/reorder/duplicate tasks
  - Создана миграция `0012_add_course_lessons_and_lesson_tasks.py`.
  - Web-admin: добавлены proxy API route handlers для lesson/task операций и клиент `builder-api.ts`.
  - Web-admin `types.ts` расширен DTO/input моделями для lessons/tasks/reorder.
- Why:
  - Текущая модель `Course -> Release -> Screen` не покрывает целевой flow сборки курса из уроков и заданий.
- Validation:
  - `cd backend && ruff check . && mypy app/` -> passed.
  - `cd web-admin && npm run lint && npm run type-check` -> passed.
- Notes:
  - Alembic autogenerate не выполнен из-за недоступной локальной PostgreSQL; миграция создана вручную.

## Entry: 2026-02-26 (fix MissingResourceException for Compose string resources on Android)
- Date: 2026-02-26
- Task: Исправить crash Android-приложения `MissingResourceException` при чтении `composeResources/.../strings.commonMain.cvr` после выноса строк в Compose resources.
- Root cause:
  - В feature-модулях на `com.android.kotlin.multiplatform.library` ресурсы из `commonMain/composeResources` корректно генерировались, но не попадали в APK assets.
  - На runtime `stringResource(...)` пытался читать файлы по пути `assets/composeResources/<module>.generated.resources/...`, которых не было в собранном APK.
- Decision/Change:
  - В `mobile/androidApp/build.gradle.kts` добавлен bridge-этап упаковки Compose ресурсов:
    - зарегистрирован task `syncComposeResourceAssets` (тип `Sync`),
    - task копирует `preparedResources/commonMain/composeResources` из модулей (`core:ui`, `feature:auth:impl`, `feature:catalog:impl`, `feature:home:impl`, `feature:player:impl`, `feature:profile:impl`) в `androidApp/build/generated/composeResourceAssets/composeResources/<package>/...`,
    - подключена зависимость `preBuild -> syncComposeResourceAssets`,
    - добавлен assets source dir `android.sourceSets["main"].assets.srcDir("$buildDir/generated/composeResourceAssets")`.
  - В `androidApp` также подключены `org.jetbrains.compose` plugin и `implementation(compose.components.resources)` для корректной работы runtime API ресурсов.
- Why:
  - Нужно гарантировать, что `stringResource` и `Font(Res.font...)` в shared/common Compose UI не приводят к падению на Android.
- Validation:
  - `cd mobile && ./gradlew :androidApp:assembleDebug` -> passed.
  - Проверка APK: присутствуют assets-файлы `assets/composeResources/digital_education_mobile.feature.*.generated.resources/values/strings.commonMain.cvr` для auth/home/player/profile (и другие ресурсы модулей).

## Entry: 2026-02-26 (mobile profile polish + UI strings to resources)
- Date: 2026-02-26
- Task: По запросу пользователя доработать профиль, убрать англицизмы в мобильном UI и вынести строковые литералы в строковые ресурсы.
- Decision/Change:
  - Профиль:
    - `ProfileContent` переведен на `stringResource`.
    - Добавлена явная кнопка сброса ошибки (`DismissError`) в карточке ошибки профиля.
  - Строковые ресурсы добавлены в модули:
    - `mobile/feature/auth/impl/src/commonMain/composeResources/values/strings.xml`
    - `mobile/feature/catalog/impl/src/commonMain/composeResources/values/strings.xml`
    - `mobile/feature/home/impl/src/commonMain/composeResources/values/strings.xml`
    - `mobile/feature/player/impl/src/commonMain/composeResources/values/strings.xml`
    - `mobile/feature/profile/impl/src/commonMain/composeResources/values/strings.xml`
    - `mobile/core/ui/src/commonMain/composeResources/values/strings.xml`
  - UI-код переведен на ресурсы в ключевых экранах:
    - auth (`AuthScreen`), catalog (`CoursesContent`), home shell (`HomeScreen` + `HomeTab`), player (`LessonContent`, `QuizStory`, `VideoStory`, `LessonCheatSheetView`, `LessonStoriesPager`, `SimulationScreen`), profile (`ProfileContent`), shared logo (`ProsvetLogo`).
  - Англоязычные user-facing строки (`Key Points`, `Commands / Code`, `Question...`, `Previous/Next`, `Theory/Close`, `Copy code`, `Play`, `Video/State`) заменены на русские строки через ресурсы.
  - В `feature/catalog/impl`, `feature/player/impl`, `feature/profile/impl` подключен `compose.components.resources` для работы `stringResource`.
- Why:
  - Централизация текста в ресурсах улучшает поддержку локализации и устраняет разбросанные hardcoded строки в Compose UI.
- Validation:
  - `cd mobile && ./gradlew :feature:profile:impl:compileCommonMainKotlinMetadata :feature:home:impl:compileCommonMainKotlinMetadata :feature:catalog:impl:compileCommonMainKotlinMetadata :feature:player:impl:compileCommonMainKotlinMetadata :feature:auth:impl:compileCommonMainKotlinMetadata :core:ui:compileCommonMainKotlinMetadata` -> passed.
  - Дополнительно: `cd mobile && ./gradlew :feature:player:impl:compileCommonMainKotlinMetadata` -> passed.

## Entry: 2026-02-26 (local catalog runtime recovery + reseed)
- Date: 2026-02-26
- Task: По запросу пользователя восстановить рабочий каталог на локальном окружении и проверить выдачу обложек на API.
- Decision/Change:
  - Проверен runtime: `GET /api/v1/health` отвечал `200`, но `GET /api/v1/catalog/courses` возвращал `500` из-за отсутствующих таблиц каталога в текущей локальной БД.
  - Применены миграции (`alembic upgrade head`) и восстановлены отсутствующие таблицы через SQLAlchemy metadata (`Base.metadata.create_all`) для локальной dev-базы.
  - Выполнен `python3 scripts/catalog_mock_data.py reset` для пересоздания 4 мок-курсов.
  - Проверено, что `/api/v1/catalog/courses` возвращает 4 курса с `cover_url`, а `/api/v1/catalog/courses/{slug}/cover` отдает `200 image/png` для всех 4 slug.
- Why:
  - Нужно было гарантировать, что клиент сразу получает рабочий каталог и backend-обложки без ручной диагностики со стороны пользователя.
- Validation:
  - `curl http://127.0.0.1:8000/api/v1/health` -> `200`.
  - Runtime check скриптом: 4 target slug присутствуют и имеют `cover_url`.
  - Runtime check скриптом: все 4 cover endpoint отвечают `200 image/png`.

## Entry: 2026-02-26 (catalog cover files served via backend API)
- Date: 2026-02-26
- Task: Завершить backend-путь для обложек курсов и закрыть тестами выдачу `cover_url`/файла обложки.
- Decision/Change:
  - В `catalog` API добавлен файл-роут `GET /api/v1/catalog/courses/{course_slug}/cover` с выдачей `FileResponse` и `404` при отсутствии файла.
  - `CourseOut` расширен полем `cover_url`; в mapper добавлена генерация URL через `request.url_for(...)` при наличии файла в `backend/storage/catalog_covers`.
  - `create_course`, `list_courses`, `get_latest_course_release` унифицированы на `_to_course_out(course, request)`.
  - 4 пользовательские обложки сохранены на backend в `backend/storage/catalog_covers/` c именами по slug:
    - `gosuslugi-basic.png`
    - `sberbank-online-security.png`
    - `zhkh-payments-online.png`
    - `telemedicine-appointments.png`
  - Добавлены/обновлены тесты каталога:
    - проверка отдачи PNG и 404 для cover endpoint,
    - проверка заполнения `cover_url` в списке курсов при наличии файла.
- Why:
  - Мобильный клиент получает стабильные превью для карточек каталога из backend без внешних URL fallback.
- Files touched:
  - `backend/app/modules/catalog/api/router.py`
  - `backend/app/modules/catalog/api/schemas.py`
  - `backend/tests/test_api_catalog.py`
  - `backend/tests/test_catalog_api_router_branches.py`
  - `backend/storage/catalog_covers/*`
- Validation:
  - `cd backend && PYTHONPATH=. pytest tests/test_api_catalog.py tests/test_catalog_api_router_branches.py` -> passed (`12 passed`).

## Entry: 2026-02-26 (android crash on catalog preview resource)
- Date: 2026-02-26
- Task: Устранить crash `MissingResourceException` при открытии каталога после добавления локальных обложек.
- Root cause:
  - `CoursesContent` пытался читать локальные Compose ресурсы (`painterResource(Res.drawable...)`), но в runtime APK отсутствовали соответствующие `composeResources/.../course_cover_*.png` assets.
  - Это приводило к падению на первом рендере карточки курса (`CoursePreviewPlaceholder`).
- Decision/Change:
  - Убрано использование `Res.drawable`/`painterResource` в `CoursesContent.kt`.
  - Fallback обложек переведен на безопасный runtime-путь: `slug -> remote URL` (Unsplash) при отсутствии `coverImageUrl` из API.
  - Сохранен защитный placeholder для `loading/error` состояний загрузки изображений.
  - Из `feature/catalog/impl` удалена ненужная зависимость `compose.components.resources`.
- Why:
  - Цель — быстро снять блокирующий crash и сохранить «реальные» превью для скриншотов без зависимости от упаковки compose resources в текущей конфигурации.
- Files touched:
  - `mobile/feature/catalog/impl/src/commonMain/kotlin/com/digitaledu/feature/catalog/impl/ui/CoursesContent.kt`
  - `mobile/feature/catalog/impl/build.gradle.kts`
- Validation:
  - `cd mobile && ./gradlew :feature:catalog:impl:compileAndroidMain :feature:catalog:impl:compileCommonMainKotlinMetadata :androidApp:assembleDebug` -> passed.

## Entry: 2026-02-26 (catalog service icons for stable screenshots)
- Date: 2026-02-26
- Task: Добавить реальные визуальные иконки сервисов в карточки каталога для стабильных скриншотов базового UI.
- Root cause:
  - В текущем API списка курсов нет полей обложек (`cover_url/photo_url/image_url`), поэтому карточки уходили в fallback и выглядели пустыми/однотипными.
  - Внешние fallback-источники изображений не подходят как гарантированный baseline для скриншотов.
- Decision/Change:
  - Добавлены локальные изображения-обложки для 4 mock-курсов в ресурсы модуля:
    - `mobile/feature/catalog/impl/src/commonMain/composeResources/drawable/course_cover_gosuslugi.png`
    - `mobile/feature/catalog/impl/src/commonMain/composeResources/drawable/course_cover_sberbank.png`
    - `mobile/feature/catalog/impl/src/commonMain/composeResources/drawable/course_cover_zhkh.png`
    - `mobile/feature/catalog/impl/src/commonMain/composeResources/drawable/course_cover_telemedicine.png`
  - В `CoursesContent.kt` добавлен маппинг `slug -> local drawable` и fallback-пайплайн:
    - при наличии `coverImageUrl` грузим сеть,
    - при отсутствии/ошибке показываем локальную иконку сервиса,
    - если slug неизвестен — градиентный placeholder.
  - В `feature/catalog/impl` включена зависимость `compose.components.resources` для typed resource access.
- Why:
  - Нужно получить воспроизводимый вид каталога для продуктовых скриншотов независимо от сети и наполнения API.
- Files touched:
  - `mobile/feature/catalog/impl/build.gradle.kts`
  - `mobile/feature/catalog/impl/src/commonMain/kotlin/com/digitaledu/feature/catalog/impl/ui/CoursesContent.kt`
  - `mobile/feature/catalog/impl/src/commonMain/composeResources/drawable/course_cover_gosuslugi.png`
  - `mobile/feature/catalog/impl/src/commonMain/composeResources/drawable/course_cover_sberbank.png`
  - `mobile/feature/catalog/impl/src/commonMain/composeResources/drawable/course_cover_zhkh.png`
  - `mobile/feature/catalog/impl/src/commonMain/composeResources/drawable/course_cover_telemedicine.png`
- Validation:
  - `cd mobile && ./gradlew :feature:catalog:impl:compileAndroidMain :feature:catalog:impl:compileCommonMainKotlinMetadata` -> passed.

## Entry: 2026-02-26 (catalog preview images not loading)
- Date: 2026-02-26
- Task: Исправить проблему, из-за которой в каталоге курсов не отображались превью-изображения карточек.
- Root cause:
  - В `feature/catalog/impl` использовался `coil3-compose` для `AsyncImage`, но отсутствовал сетевой fetcher модуль Coil (`coil3-network-ktor`).
  - В итоге URL-модели передавались в `AsyncImage`, но фактическая загрузка по сети не выполнялась, и UI оставался на базовом фоне карточки.
- Decision/Change:
  - Добавлена зависимость `implementation(libs.coil3.network.ktor)` в `mobile/feature/catalog/impl/build.gradle.kts`.
  - Выбран тот же подход, что уже используется в `feature/player/impl`, чтобы не расходиться по паттерну загрузки изображений между фичами.
- Why:
  - Это минимальный и корректный фикс корневой причины без изменения контрактов UI/данных.
- Files touched:
  - `mobile/feature/catalog/impl/build.gradle.kts`
- Validation:
  - `cd mobile && ./gradlew :feature:catalog:impl:compileAndroidMain :feature:catalog:impl:compileCommonMainKotlinMetadata` -> passed.

## Entry: 2026-02-26 (catalog preview fallback for screenshots)
- Date: 2026-02-26
- Task: Обеспечить стабильное отображение превью карточек каталога даже при недоступности внешних изображений.
- Root cause:
  - Backend для текущих мок-курсов не отдает `cover_url/photo_url/image_url`, а fallback на внешнюю `picsum.photos` может быть нестабилен в отдельных окружениях/эмуляторах.
- Decision/Change:
  - В `CoursesContent.kt` fallback на внешние URL удален.
  - Для карточек без обложки или при ошибке загрузки добавлен локальный визуальный placeholder (`CoursePreviewPlaceholder`) с детерминированной градиентной палитрой по slug.
  - `AsyncImage` заменен на `SubcomposeAsyncImage` с явными `loading/error` состояниями, ведущими к тому же placeholder.
- Why:
  - Нужен предсказуемый базовый вид каталога для скриншотов независимо от сети и наличия реальных cover-image в API.
- Files touched:
  - `mobile/feature/catalog/impl/src/commonMain/kotlin/com/digitaledu/feature/catalog/impl/ui/CoursesContent.kt`
- Validation:
  - `cd mobile && ./gradlew :feature:catalog:impl:compileAndroidMain :feature:catalog:impl:compileCommonMainKotlinMetadata` -> passed.

## Entry: 2026-02-26 (otp/phone cleanup follow-up)
- Date: 2026-02-26
- Task: Дозачистить остатки OTP/phone-based auth в локальных env и проектных инструкциях.
- Decision/Change:
  - В `backend/.env` удалены неиспользуемые переменные `APP_OTP_*`, `APP_ADMIN_PHONE_NUMBERS`, `APP_DEBUG_RETURN_OTP_CODE`.
  - В `AGENTS.md` обновлено описание auth-модуля: login/password + optional QR (без OTP), удален OTP security guideline.
- Why:
  - После удаления OTP из backend/web/mobile и схем нужно синхронизировать рабочие env/документацию, чтобы не оставлять ложные конфигурации.
- Files touched:
  - `backend/.env`
  - `AGENTS.md`
- Validation:
  - grep по `*.env*`, `*.md`, `*.py` не показывает рабочих ссылок на OTP/phone_hash вне миграций/исторических контекстов.

## Entry: 2026-02-26 (auth branding switch + registration CTA)
- Date: 2026-02-26
- Task: Убрать старый логотип с экрана логина, вывести бренд «Просвет» на русском в шрифте сайта и добавить кнопку регистрации.
- Decision/Change:
  - В `AuthScreen` удален компонент `ProsvetLogo` и добавлен текстовый брендинг `"Просвет"`.
  - Подключен шрифт сайта `Russo One` как Compose ресурс:
    - добавлен файл `mobile/feature/auth/impl/src/commonMain/composeResources/font/russo_one_regular.ttf`.
    - в UI используется `FontFamily(Font(Res.font.russo_one_regular))`.
  - Кнопка `"Регистрация"` подключена к отдельному экрану внутри auth feature (internal route `auth/register`) через локальный `NavHost` в `AuthRoute`.
  - Добавлен экран `RegistrationScreen` с формой (ФИО, логин, пароль, подтверждение), валидацией совпадения паролей и отдельной CTA `"Создать аккаунт"`.
  - Пока backend-эндпоинта для self-signup нет, по submit выводится явное информирование о временной недоступности самостоятельной регистрации.
- Why:
  - Пользователь запросил более чистый брендинг без старого лого и явный сценарий регистрации на экране авторизации.
- Files touched:
  - `mobile/feature/auth/impl/src/commonMain/kotlin/com/digitaledu/feature/auth/impl/AuthScreen.kt`
  - `mobile/feature/auth/impl/src/commonMain/composeResources/font/russo_one_regular.ttf`
- Validation:
  - `cd mobile && ./gradlew :feature:auth:impl:compileAndroidMain` -> passed.

## Entry: 2026-02-26 (mobile auth screen visual refresh)
- Date: 2026-02-26
- Task: Привести в порядок визуальный дизайн экрана логина в мобильном приложении.
- Decision/Change:
  - Обновлен `AuthScreen` с более чистой и читаемой композицией: мягкий фон без хардкода indigo-палитры, декоративные shape-элементы, улучшенные отступы и ширина формы.
  - Форма входа переработана под UX-паттерн «один явный primary action»: добавлены иконки полей, единый стиль кнопки, аккуратный loading-state в CTA.
  - Сообщения об ошибках перенесены ближе к точке действия (внутрь карточки формы), добавлен supporting hint для пароля.
  - Удалены лишние прямые color-константы в ключевых контролах в пользу `MaterialTheme.colorScheme`.
- Why:
  - Текущий login выглядел визуально несогласованно и перегруженно; нужно было повысить читаемость и аккуратность UI без изменения auth-логики.
- Files touched:
  - `mobile/feature/auth/impl/src/commonMain/kotlin/com/digitaledu/feature/auth/impl/AuthScreen.kt`
- Validation:
  - `cd mobile && ./gradlew :feature:auth:impl:compileAndroidMain` -> passed.

## Entry: 2026-02-26 (unified mock catalog CLI: seed/cleanup/reset)
- Date: 2026-02-26
- Task: Объединить seed/cleanup в единый CLI-скрипт и оставить обратную совместимость со старыми командами.
- Decision/Change:
  - Добавлен единый сценарий `backend/scripts/catalog_mock_data.py` с subcommands:
    - `seed` — создать/обновить мок-курсы,
    - `cleanup` — удалить мок-курсы,
    - `reset` — cleanup + seed.
  - Общие данные и логика (`blueprints`, `TARGET_SLUGS`, checksum, DB-операции) централизованы в одном файле.
  - Старые скрипты оставлены как тонкие wrappers для совместимости:
    - `backend/scripts/seed_mixed_lesson.py`
    - `backend/scripts/cleanup_mixed_lesson.py`
  - Для `cleanup`/`reset` поддержан `--dry-run`.
- Why:
  - Упростить поддержку и запуск: одна точка входа для mock-данных без дублирования кода.
- Files touched:
  - `backend/scripts/catalog_mock_data.py`
  - `backend/scripts/seed_mixed_lesson.py`
  - `backend/scripts/cleanup_mixed_lesson.py`
- Validation:
  - `python3 -m compileall backend/scripts/catalog_mock_data.py backend/scripts/seed_mixed_lesson.py backend/scripts/cleanup_mixed_lesson.py` -> passed.
  - `python3 backend/scripts/catalog_mock_data.py --help` -> passed.
  - `python3 backend/scripts/catalog_mock_data.py cleanup --dry-run` -> passed.
  - `python3 backend/scripts/catalog_mock_data.py reset --dry-run` -> passed.

## Entry: 2026-02-26 (cleanup script for diploma mock catalog)
- Date: 2026-02-26
- Task: Добавить отдельный cleanup-скрипт для удаления дипломных мок-курсов, созданных сидером.
- Decision/Change:
  - Добавлен `backend/scripts/cleanup_mixed_lesson.py`.
  - Скрипт удаляет целевые курсы по slug (`gosuslugi-basic`, `sberbank-online-security`, `zhkh-payments-online`, `telemedicine-appointments`).
  - Поддержан безопасный режим проверки `--dry-run` без удаления данных.
  - Удаление выполняется через таблицу `courses`, связанные release/screen данные удаляются каскадно.
- Why:
  - Нужен быстрый способ очищать тестовый каталог перед повторным сидингом/демо.
- Files touched:
  - `backend/scripts/cleanup_mixed_lesson.py`
- Validation:
  - `python3 -m compileall backend/scripts/cleanup_mixed_lesson.py` -> passed.
  - `python3 backend/scripts/cleanup_mixed_lesson.py --dry-run` -> passed.

## Entry: 2026-02-26 (diploma-themed mobile catalog seed script)
- Date: 2026-02-26
- Task: Подготовить чистый backend seed-скрипт с реалистичными мок-уроками по теме ВКР (Госуслуги, СберБанк, ЖКХ, телемедицина) для отображения в мобильном клиенте.
- Decision/Change:
  - Полностью обновлен `backend/scripts/seed_mixed_lesson.py` без изменений API/схем backend.
  - Скрипт теперь идемпотентно создает/обновляет 4 тематических курса и публикует релиз `1.0.0` для каждого.
  - Для каждого курса создаются экраны `article -> video -> simulation -> quiz` с осмысленными русскоязычными payload'ами и релевантными `image_url` для simulation.
  - На перезапуске скрипт очищает и пересобирает экраны релиза, чтобы данные оставались консистентными.
- Why:
  - Пользователь запросил наполнение именно через скрипт и без хардкода в backend-логике.
- Files touched:
  - `backend/scripts/seed_mixed_lesson.py`
- Validation:
  - `python3 -m compileall backend/scripts/seed_mixed_lesson.py` -> passed.
  - `python3 backend/scripts/seed_mixed_lesson.py` -> passed (созданы 4 курса и 4 релиза).

## Entry: 2026-02-26 (web heading font updated)
- Date: 2026-02-26
- Task: Сделать более выразительный шрифт именно для заголовков на веб-лендинге.
- Decision/Change:
  - В `web/app/layout.tsx` шрифт display заменен с `Outfit` на `Rubik` (с поддержкой cyrillic + latin).
  - Локальный оверрайд шрифта слова «Просвет» в hero удален, чтобы весь заголовочный стиль был единообразным.
- Files touched:
  - `web/app/layout.tsx`
  - `web/src/features/landing/ui/Hero.tsx`

## Entry: 2026-02-26 (landing copy reframed to gov/social project tone)
- Date: 2026-02-26
- Task: Перевести наполнение лендинга `web` в тональность гос/соц проекта.
- Decision/Change:
  - Обновлены заголовки и CTA под роли кураторов, координаторов и социальных операторов.
  - Карточки возможностей и описания адаптированы под муниципальные/социальные программы, центры долголетия и НКО.
  - Метрики и примеры сценариев скорректированы под социальный контекст (граждане 55+, госуслуги, сопровождение).
- Files touched:
  - `web/src/features/landing/ui/Hero.tsx`
  - `web/src/features/landing/ui/Features.tsx`
  - `web/src/features/landing/ui/About.tsx`
  - `web/src/features/landing/ui/Footer.tsx`

## Entry: 2026-02-26 (landing copy tone adjusted to active product)
- Date: 2026-02-26
- Task: Скорректировать тексты лендинга `web`, чтобы позиционирование выглядело как действующий продукт, без упоминания ВКР.
- Decision/Change:
  - Убраны прямые упоминания ВКР из hero/features/about/footer блоков.
  - Формулировки переведены в product-tone: действующая платформа, ключевые возможности, отзывы команды, рабочая панель.
  - Метрики hero заменены с исследовательского контекста на продуктовые показатели платформы.
- Files touched:
  - `web/src/features/landing/ui/Hero.tsx`
  - `web/src/features/landing/ui/Features.tsx`
  - `web/src/features/landing/ui/About.tsx`
  - `web/src/features/landing/ui/Footer.tsx`

## Entry: 2026-02-26 (web landing copy aligned with thesis topic)
- Date: 2026-02-26
- Task: Переписать тексты лендинга `web` под тематику ВКР о симуляционной платформе цифровой грамотности для аудитории 55+.
- Decision/Change:
  - Обновлены hero- и секционные тексты под формулировки из материалов `../Доки/DiplomNikita`.
  - Убраны маркетинговые формулировки про корпоративное обучение; акцент смещен на цифровую инклюзию старшего поколения, безопасную практику и No-Code конструктор.
  - Пересобраны карточки возможностей и метрики (контекст проблемы + особенности решения), обновлены CTA и поясняющие блоки.
- Files touched:
  - `web/src/features/landing/ui/Hero.tsx`
  - `web/src/features/landing/ui/Features.tsx`
  - `web/src/features/landing/ui/About.tsx`
  - `web/src/features/landing/ui/Footer.tsx`
- Validation:
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-02-26 (run script frontend autodetection)
- Date: 2026-02-26
- Task: Упростить локальный запуск backend + frontend одним `./run` без ручного переключения frontend каталога.
- Decision/Change:
  - Обновлен `run`: добавлен `WEB_DIR_NAME` (env override).
  - По умолчанию `./run` теперь выбирает `web-admin`, если директория существует, иначе использует `web`.
  - Добавлена ранняя валидация frontend директории и более понятное сообщение об ошибке.
  - Обновлен help-блок `./run --help` с новым параметром `WEB_DIR_NAME`.
- Why:
  - В репозитории есть оба frontend-каталога (`web` и `web-admin`), и ручной выбор мешает быстрому старту среды.
- Files touched:
  - `run`
- Validation:
  - `bash -n ./run` -> passed.
  - `./run --help` -> отображает `WEB_DIR_NAME`.

## Entry: 2026-02-26 (docker postgres platform alignment)
- Date: 2026-02-26
- Task: Починить локальный запуск `./run`, который падал на шаге PostgreSQL с `exec format error`.
- Decision/Change:
  - В `docker-compose.yml` для сервиса `postgres` добавлен `platform: ${POSTGRES_PLATFORM:-linux/amd64}`.
  - Выполнен `docker compose pull postgres` для перезагрузки образа в целевой архитектуре.
- Why:
  - Runtime Docker работает как `linux/amd64`, а ранее локально был образ другой архитектуры, из-за чего контейнер не стартовал.
- Files touched:
  - `docker-compose.yml`
- Validation:
  - `docker image inspect postgres:16-alpine --format '{{.Architecture}}/{{.Os}}'` -> `amd64/linux`.
  - `./run` -> backend поднялся (`/api/v1/health` = `200`), frontend слушает `127.0.0.1:3000`.

## Entry: 2026-02-26 (codegraphcontext startup stabilization)
- Date: 2026-02-26
- Task: Убрать падение CodeGraphContext watcher при `./run` и стабилизировать логирование.
- Decision/Change:
  - В `run` добавлен `CGC_DATABASE` (по умолчанию `falkordb`) для запуска watcher без обязательного локального Neo4j.
  - Добавлен `CGC_LOG_FILE` и перенаправление вывода watcher в отдельный лог-файл `.run/codegraph-watch.log`.
  - Обновлен help-блок `./run --help` с новыми параметрами окружения для CGC.
- Why:
  - Локальная конфигурация `codegraphcontext` была привязана к `neo4j://localhost:7687`, что вызывало stack trace при отсутствии Neo4j и шумело в основном dev-логе.
- Files touched:
  - `run`
- Validation:
  - `bash -n ./run` -> passed.
  - `./run` -> backend health `200`, frontend слушает `127.0.0.1:3000`.
  - В основном логе запуска отсутствует Neo4j stack trace; CGC пишет в `.run/codegraph-watch.log`.

## Entry: 2026-02-26 (admin login 500 root-cause fix)
- Date: 2026-02-26
- Task: Исправить `500 Internal Server Error` при входе в web admin (`/api/admin/auth/login`).
- Decision/Change:
  - Выявлено, что backend ходил в локальный Postgres на `localhost:5432` (не контейнер проекта), где отсутствовали таблицы (`relation "users" does not exist`).
  - Переключены локальные DB порты проекта на `5433` в env-конфигах:
    - `.env`: `POSTGRES_PORT`, `APP_DATABASE_URL`
    - `backend/.env`: `POSTGRES_PORT`, `APP_DATABASE_URL`, `TEST_DATABASE_URL`
  - Перезапущен стек (`docker compose down` + `./run`), миграции применились к контейнерной БД проекта.
- Why:
  - На хосте уже был занят `5432` (локальный postgres/forward), из-за чего backend подключался не к проектной БД.
- Files touched:
  - `.env`
  - `backend/.env`
- Validation:
  - `POST /api/v1/auth/login` с `admin/admin12345` -> `200` + access/refresh tokens.
  - `POST /api/admin/auth/login` -> `200` + `{ "status": "ok" }`.

## Entry: 2026-02-25 (mobile viewmodel state normalization + model split)
- Date: 2026-02-25
- Task: Нормализовать состояние ProfileViewModel до единого state-слота и разнести data/sealed модели по отдельным файлам в mobile.
- Decision/Change:
  - `ProfileUiState` переведен на единый `status: ProfileStatus` (`Idle | LoggingOut | Error`), обновлены `ProfileViewModel`, `ProfileContent`, `HomeRoute`.
  - Из `core/model` вынесены в отдельные файлы классы payload/quiz/catalog/reference:
    - `ScreenPayload` реализации (`SimulationPayload`, `VideoPayload`, `ArticlePayload`, `QuizPayload`, `CheatSheetPayload`, `UnknownPayload`) и `Hotspot`.
    - `QuizQuestion` реализации (`SingleChoiceQuestion`, `MultipleChoiceQuestion`, `MatchingQuestion`) и отдельные `QuizOption`, `MatchingItem`.
    - `CatalogCourse`, `CatalogRelease`, `CatalogScreen`, `CodeSnippet` вынесены из агрегирующих файлов.
  - DTO-модели Ktor вынесены из data source файлов в отдельные файлы (`core/network/ktor/*Response.kt`, `*Payload.kt`).
  - Локальная `SavedCourseProgress` вынесена из `PlayerViewModel` в отдельный файл.
  - Обновлены все использования новых типов в player/ui/viewmodel слоях.
- Why:
  - Упростить управление состоянием в ViewModel и снизить «склейку» большого числа data/sealed классов в одном файле.
- Files touched:
  - `mobile/feature/home/impl/**`
  - `mobile/core/model/**`
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/ktor/**`
- Validation:
  - `cd mobile && ./gradlew test` -> `BUILD SUCCESSFUL`.

## Entry: 2026-02-25 (mobile core.model package decomposition)
- Date: 2026-02-25
- Task: Убрать «плоский» гигантский `core.model` package и разложить модели по доменным подпакетам.
- Decision/Change:
  - Введены подпакеты в `core/model`:
    - `auth` (`AuthTokens`, `OtpChallenge`, `AuthSessionState`)
    - `catalog` (`CatalogBundle`, `CatalogCourse`, `CatalogRelease`, `CatalogScreen`)
    - `content` (`ScreenPayload`, payload-типы, `Hotspot`)
    - `quiz` (`QuizQuestion` + question/option/item модели)
    - `reference` (`LessonReference`, `CodeSnippet`)
  - Обновлены импорты во всех зависимых слоях: `core:data`, `core:network`, `feature:home`, `androidApp`.
- Why:
  - Снизить когнитивную сложность `core.model` и сделать навигацию/ownership моделей более явными.
- Files touched:
  - `mobile/core/model/src/commonMain/kotlin/com/digitaledu/core/model/*.kt`
  - `mobile/core/data/**`
  - `mobile/core/network/**`
  - `mobile/feature/home/impl/**`
  - `mobile/androidApp/**`
- Validation:
  - `cd mobile && ./gradlew test` -> `BUILD SUCCESSFUL`.

## Entry: 2026-02-25 (mobile model folders aligned to package namespaces)
- Date: 2026-02-25
- Task: Привести физическую структуру файлов `core/model` к новым подпакетам и зафиксировать архитектурный план для `feature/home/impl`.
- Decision/Change:
  - Файлы моделей физически перемещены в директории:
    - `core/model/auth/*`
    - `core/model/catalog/*`
    - `core/model/content/*`
    - `core/model/quiz/*`
    - `core/model/reference/*`
  - Добавлен архитектурный документ с целевой декомпозицией `feature/home/impl`:
    - `.context/architecture/mobile_feature_impl_refactor.md`
- Why:
  - Согласовать package-namespace и файловую структуру, упростить навигацию по коду и подготовить пошаговый refactor feature-границ.
- Validation:
  - `cd mobile && ./gradlew test` -> `BUILD SUCCESSFUL`.

## Entry: 2026-02-25 (catalog feature extracted from home impl)
- Date: 2026-02-25
- Task: Начать декомпозицию `feature/home/impl` и вынести `catalog` в отдельные `api/impl` модули без изменения UX.
- Decision/Change:
  - Созданы новые модули:
    - `mobile/feature/catalog/api`
    - `mobile/feature/catalog/impl`
  - В `catalog-api` вынесены контракты:
    - `CatalogIntent`, `CatalogUiState`, `CatalogEffect`, `CatalogFeatureHost`.
  - В `catalog-impl` перенесена реализация:
    - `CatalogViewModel` (реализует `CatalogFeatureHost`),
    - `catalogFeatureModule()` для DI.
  - Удалены старые catalog-классы из `home/impl/catalog`.
  - `HomeRoute`, `HomeScreen`, `CoursesContent` переведены на импорты из `feature.catalog.api`.
  - DI wiring обновлен:
    - `shared` включает `catalogFeatureModule()`,
    - `homeFeatureModule()` больше не создает `CatalogViewModel`.
  - Gradle wiring обновлен:
    - добавлены `:feature:catalog:api`, `:feature:catalog:impl` в `settings.gradle.kts`,
    - `home-impl` зависит от `projects.feature.catalog.api`,
    - `shared` зависит от `projects.feature.catalog.impl`.
- Why:
  - Снизить связность `home/impl` и перейти к целевой модели shell + самостоятельные feature-модули.
- Validation:
  - `cd mobile && ./gradlew test` -> `BUILD SUCCESSFUL`.

## Entry: 2026-02-25 (profile feature extracted from home impl)
- Date: 2026-02-25
- Task: Продолжить декомпозицию `feature/home/impl` и вынести `profile` в отдельные `api/impl` модули без изменения UX.
- Decision/Change:
  - Созданы новые модули:
    - `mobile/feature/profile/api`
    - `mobile/feature/profile/impl`
  - В `profile-api` вынесены контракты:
    - `ProfileIntent`, `ProfileUiState`, `ProfileStatus`, `ProfileEffect`, `ProfileFeatureHost`.
  - В `profile-impl` перенесена реализация:
    - `ProfileViewModel` (реализует `ProfileFeatureHost`),
    - `profileFeatureModule()` для DI.
  - Удалены старые profile-классы из `home/impl/profile`.
  - `HomeRoute`, `HomeScreen`, `ProfileContent` переведены на импорты из `feature.profile.api`.
  - DI wiring обновлен:
    - `shared` включает `profileFeatureModule()`,
    - `homeFeatureModule()` больше не создает `ProfileViewModel`.
  - Gradle wiring обновлен:
    - добавлены `:feature:profile:api`, `:feature:profile:impl` в `settings.gradle.kts`,
    - `home-impl` зависит от `projects.feature.profile.api`,
    - `shared` зависит от `projects.feature.profile.impl`.
- Why:
  - Продолжить снижение связности `home/impl` и приближение к целевой architecture shell + isolated feature modules.
- Validation:
  - `cd mobile && ./gradlew test` -> `BUILD SUCCESSFUL`.

## Entry: 2026-02-25 (player feature extracted from home impl)
- Date: 2026-02-25
- Task: Продолжить декомпозицию `feature/home/impl` и вынести `player` в отдельные `api/impl` модули без изменения UX.
- Decision/Change:
  - Созданы новые модули:
    - `mobile/feature/player/api`
    - `mobile/feature/player/impl`
  - В `player-api` вынесены контракты:
    - `PlayerIntent`, `PlayerUiState`, `PlayerEffect`, `PlayerFeatureHost`.
  - В `player-impl` перенесена реализация:
    - `PlayerViewModel`,
    - `SimulationUrlResolver`,
    - `SavedCourseProgress`,
    - `playerFeatureModule()` для DI.
  - Удалены старые player-классы из `home/impl/player` и `home/impl/utils/SimulationUrlResolver.kt`.
  - `HomeRoute`, `HomeScreen`, `LessonContent` и player UI компоненты в `home/impl/ui/**` переведены на импорты из `feature.player.api`.
  - DI wiring обновлен:
    - `shared` включает `playerFeatureModule()`,
    - `homeFeatureModule()` теперь содержит только `HomeFeatureEntry` (без ViewModel/Resolver binding).
  - Gradle wiring обновлен:
    - добавлены `:feature:player:api`, `:feature:player:impl` в `settings.gradle.kts`,
    - `home-impl` зависит от `projects.feature.player.api`,
    - `shared` зависит от `projects.feature.player.impl`.
- Why:
  - Довести декомпозицию `home/impl` до shell-ориентированной роли и убрать доменную реализацию player из orchestration-слоя.
- Validation:
  - `cd mobile && ./gradlew test` -> `BUILD SUCCESSFUL`.

## Entry: 2026-02-25 (home shell finalization + api contract tests)
- Date: 2026-02-25
- Task: Завершить роль `home/impl` как shell и добавить минимальные тесты контрактов в вынесенных API-модулях.
- Decision/Change:
  - `homeFeatureModule()` упрощен до регистрации `HomeFeatureEntry` (без binding доменных ViewModel/Resolver).
  - Добавлены jvmTest-контрактные тесты:
    - `mobile/feature/catalog/api/src/jvmTest/kotlin/com/digitaledu/feature/catalog/api/CatalogContractsTest.kt`
    - `mobile/feature/profile/api/src/jvmTest/kotlin/com/digitaledu/feature/profile/api/ProfileContractsTest.kt`
    - `mobile/feature/player/api/src/jvmTest/kotlin/com/digitaledu/feature/player/api/PlayerContractsTest.kt`
- Why:
  - Зафиксировать модульные API-контракты и снизить риск регрессий при дальнейшей эволюции `impl` без зависимости от `home`.
- Validation:
  - `cd mobile && ./gradlew test` -> `BUILD SUCCESSFUL`.

## Entry: 2026-02-25 (impl internal architecture normalization)
- Date: 2026-02-25
- Task: Нормализовать внутреннюю архитектуру `feature/*/impl` по схеме `di/presentation/domain` и зафиксировать policy для слоя data.
- Decision/Change:
  - Выполнен package/file move без изменения поведения:
    - `catalog-impl`: `CatalogFeatureModule` -> `di`, `CatalogViewModel` -> `presentation`.
    - `profile-impl`: `ProfileFeatureModule` -> `di`, `ProfileViewModel` -> `presentation`.
    - `player-impl`: `PlayerFeatureModule` -> `di`, `PlayerViewModel` -> `presentation`, `SimulationUrlResolver`/`SavedCourseProgress` -> `domain`.
  - Обновлены DI imports в `shared` на новые package namespace.
  - Зафиксировано архитектурное правило: feature-local `data` не создаем по умолчанию, используем `core:data`; `impl/data` вводим только при реальной feature-specific data логике.
- Why:
  - Сделать структуру impl-модулей единообразной и читаемой, не дублируя общий data слой.
- Validation:
  - `cd mobile && ./gradlew test` -> `BUILD SUCCESSFUL`.

## Entry: 2026-02-25 (player viewmodel domain use-case extraction)
- Date: 2026-02-25
- Task: Сделать `PlayerViewModel` тоньше, вынеся часть доменной логики в use-case классы без изменения поведения.
- Decision/Change:
  - Добавлены domain use-case классы в `player-impl`:
    - `ProgressTransitionUseCase` (логика completed screens при переходах)
    - `RestoreCourseProgressUseCase` (восстановление/нормализация сохраненного прогресса)
    - `ResolveReferenceIdUseCase` (извлечение reference id из `ScreenPayload`)
  - `PlayerViewModel` переведен на использование этих use-case классов.
  - Добавлены jvm unit tests для domain-логики:
    - `mobile/feature/player/impl/src/jvmTest/kotlin/com/digitaledu/feature/player/impl/domain/PlayerDomainUseCasesTest.kt`
  - Для jvmTest в `player-impl` подключен `kotlin("test")`.
- Why:
  - Снизить когнитивную нагрузку в ViewModel и зафиксировать ключевую доменную логику независимыми тестами.
- Validation:
  - RED: `cd mobile && ./gradlew :feature:player:impl:jvmTest` -> failed (ожидаемо, до добавления use-case/test setup).
  - GREEN: `cd mobile && ./gradlew :feature:player:impl:jvmTest` -> `BUILD SUCCESSFUL`.
  - Regression: `cd mobile && ./gradlew test` -> `BUILD SUCCESSFUL`.

## Entry: 2026-02-25 (player navigation orchestration extraction)
- Date: 2026-02-25
- Task: Вынести навигационную orchestration-логику (`Next/Previous/NavigateToScreen/Hotspot`) из `PlayerViewModel` в domain use-cases.
- Decision/Change:
  - Добавлены domain сущности/классы:
    - `NavigationCommand`, `NavigationOutcome`
    - `ResolveNavigationUseCase`
    - `HotspotAction`
    - `ResolveHotspotActionUseCase`
  - `PlayerViewModel` переведен на общий `navigate(command)` + `ResolveHotspotActionUseCase`.
  - Добавлены unit tests:
    - `mobile/feature/player/impl/src/jvmTest/kotlin/com/digitaledu/feature/player/impl/domain/PlayerNavigationUseCasesTest.kt`
- Why:
  - Уменьшить размер и branching в ViewModel, упростить локальное тестирование доменной навигации.
- Validation:
  - RED: `cd mobile && ./gradlew :feature:player:impl:jvmTest --tests "*PlayerNavigationUseCasesTest"` -> failed (unresolved symbols, затем compile errors test/contracts).
  - GREEN: после реализации use-cases и правок тестов -> `BUILD SUCCESSFUL`.
  - Regression: `cd mobile && ./gradlew test` -> `BUILD SUCCESSFUL`.

## Entry: 2026-02-25 (catalog use-case extraction)
- Date: 2026-02-25
- Task: Симметрично утончить `CatalogViewModel`, вынеся repository сценарии в domain use-cases.
- Decision/Change:
  - Добавлены use-cases:
    - `LoadCoursesUseCase`
    - `OpenCourseBundleUseCase`
  - `CatalogViewModel` переведен на use-case зависимости вместо прямого `CatalogRepository`.
  - DI wiring обновлен в `catalogFeatureModule()` для регистрации use-cases.
  - Добавлен unit test файл:
    - `mobile/feature/catalog/impl/src/jvmTest/kotlin/com/digitaledu/feature/catalog/impl/domain/CatalogDomainUseCasesTest.kt`
  - Для `catalog-impl` jvmTest подключен `kotlin("test")`.
- Why:
  - Привести `catalog-impl` к той же architecture discipline, что и `player-impl`: ViewModel orchestration + domain use-cases.
- Validation:
  - RED: `cd mobile && ./gradlew :feature:catalog:impl:jvmTest --tests "*CatalogDomainUseCasesTest"` -> failed (test deps + missing use-cases).
  - GREEN: после добавления use-cases/test deps -> `BUILD SUCCESSFUL`.
  - Regression: `cd mobile && ./gradlew test` -> `BUILD SUCCESSFUL`.

## Entry: 2026-02-25 (profile use-case extraction)
- Date: 2026-02-25
- Task: Симметрично утончить `ProfileViewModel`, вынеся logout сценарий в domain use-case.
- Decision/Change:
  - Добавлен use-case:
    - `LogoutUseCase`
  - `ProfileViewModel` переведен на use-case зависимость вместо прямого `AuthRepository`.
  - DI wiring обновлен в `profileFeatureModule()` для регистрации `LogoutUseCase`.
  - Добавлен unit test:
    - `mobile/feature/profile/impl/src/jvmTest/kotlin/com/digitaledu/feature/profile/impl/domain/LogoutUseCaseTest.kt`
  - Для `profile-impl` подключены test dependencies (`kotlin("test")`) и `core.model`.
- Why:
  - Завершить выравнивание `feature/*/impl` по use-case oriented pattern.
- Validation:
  - RED: `cd mobile && ./gradlew :feature:profile:impl:jvmTest --tests "*LogoutUseCaseTest"` -> failed (test deps + missing use-case).
  - GREEN: после правок -> `BUILD SUCCESSFUL`.
  - Regression: `cd mobile && ./gradlew test` -> `BUILD SUCCESSFUL`.

## Entry: 2026-02-25 (mobile feature template docs)
- Date: 2026-02-25
- Task: Зафиксировать единый шаблон для новых mobile feature модулей (`api/impl`) и обновить обзор архитектуры.
- Decision/Change:
  - Добавлен документ-шаблон:
    - `mobile/docs/feature-impl-template.md`
  - Обновлен `mobile/README.md`:
    - добавлена ссылка на template doc,
    - актуализирован список feature модулей (`catalog/player/profile`) и роль `home` как shell/orchestration.
- Why:
  - Чтобы новые фичи создавались по единому стандарту (`di/presentation/domain`, api contracts, test baseline) без дрейфа архитектуры.
- Validation:
  - Документационное изменение, runtime поведение не меняется.

## Entry: 2026-02-25 (architecture memory snippet for feature template)
- Date: 2026-02-25
- Task: Добавить короткий template snippet в архитектурную память `.context`, чтобы стандарт был виден и в `README`, и в `.context/architecture`.
- Decision/Change:
  - В `.context/architecture/mobile_feature_impl_refactor.md` добавлена секция `Quick Template` с краткой структурой `feature/<name>/api` и `feature/<name>/impl (di/presentation/domain)`.
  - Добавлена ссылка на полный документ-шаблон: `mobile/docs/feature-impl-template.md`.
- Why:
  - Упростить использование стандарта в будущих сессиях без переключения между несколькими документами.
- Validation:
  - Документационное изменение, runtime поведение не меняется.

## Entry: 2026-02-25 (export docs to thesis folder)
- Date: 2026-02-25
- Task: Перенести подготовленные документы по бизнес-процессам из репозитория в папку ВКР по запросу пользователя.
- Decision/Change:
  - Перемещены документы из `docs/business-processes/` в внешнюю папку `../Доки/` (каталог ВКР).
  - Внутри репозитория папка `docs/business-processes/` осталась пустой после перемещения.
- Why:
  - Пользователь запросил хранение материалов в рабочей папке ВКР, а не в репозитории проекта.
- Files touched:
  - `docs/business-processes/cjm_as_is_to_be.md` (moved)
  - `docs/business-processes/figures_05_10_specs.md` (moved)
  - `docs/business-processes/idef0_diagram_blueprint.md` (moved)
  - `docs/business-processes/idef0_learning_process_as_is_to_be.md` (moved)
  - `docs/business-processes/target_audience_portrait_expanded.md` (moved)
- Next step:
  - При необходимости синхронизировать репозиторий и ВКР-папку выбранной стратегией (оставить только внешнюю копию или вернуть документы в `docs/`).

## Entry: 2026-02-25 (logging middleware error-path coverage)
- Date: 2026-02-25
- Task: Поднять покрытие middleware observability и зафиксировать поведение метрик при исключениях.
- Decision/Change:
  - Добавлен новый тестовый suite `backend/tests/test_logging_middleware.py`.
  - Покрыты два сценария `LoggingMiddleware`:
    - success path: выставление `X-Request-ID` / `X-Process-Time` и инкремент `requests_total` без роста `errors_total`;
    - error path: при исключении в handler инкрементируются `requests_total` и `errors_total`.
- Validation:
  - `ruff check tests/test_logging_middleware.py` -> passed.
  - `PYTHONPATH=. pytest tests/test_logging_middleware.py` -> passed (2 passed).

## Entry: 2026-02-25 (policy dependency hardening and auth deps coverage)
- Date: 2026-02-25
- Task: Продолжить hardening backend после внедрения DB-backed policy engine и закрыть слабые ветки в auth dependencies.
- Decision/Change:
  - `require_policy(...)` в `app/shared/auth/deps.py` ограничен по типу ошибок БД:
    - fallback на static map выполняется только при `SQLAlchemyError`,
    - некорректные role values из DB аккуратно пропускаются,
    - при отсутствии policy остается явный `500 Policy is not configured`.
  - Уточнены typing-аннотации dependency factories:
    - `require_roles` и `require_policy` -> `Callable[..., CurrentActor]` (соответствует фактическим FastAPI dependencies).
  - Добавлены тесты для auth dependencies:
    - новый suite `backend/tests/test_auth_deps.py` покрывает auth-error ветки (`no token`, `wrong scheme`, `invalid token`, `inactive user`) и success-path для actor mapping/role checks.
  - Расширен `backend/tests/test_policy_dependency.py`:
    - fallback проверяется через `SQLAlchemyError`,
    - добавлен кейс с неизвестной role в DB.
- Validation:
  - `ruff check app/shared/auth/deps.py tests/test_auth_deps.py tests/test_policy_dependency.py tests/test_metrics_endpoint.py` -> passed.
  - `PYTHONPATH=. mypy app/shared/auth/deps.py` -> passed.
  - `PYTHONPATH=. pytest tests/test_auth_deps.py tests/test_policy_dependency.py tests/test_metrics_endpoint.py` -> passed (14 passed).
  - Stabilized integration test setup by making `tests/conftest.py::test_engine` autouse at session level, so DB tables are always created before API tests.
  - `PYTHONPATH=. pytest` -> passed (`236 passed, 2 skipped`).
  - `PYTHONPATH=. pytest --cov=app --cov-report=term --cov-fail-under=82` -> passed (`94.47%`).

## Entry: 2026-02-25 (idef0 business process model for thesis)
- Date: 2026-02-25
- Task: Подготовить формализованное описание главного бизнес-процесса обучения старшего поколения в формате IDEF0 (AS-IS / TO-BE) для построения схем.
- Decision/Change:
  - Создан отдельный документ с контекстным уровнем `A0` и декомпозицией блоков.
  - Для каждого блока зафиксированы `Input`, `Control`, `Mechanism`, `Output` в табличном формате.
  - Разделены текущая модель (`AS-IS`) и целевая модель с ИС (`TO-BE`) для прямого сопоставления при оформлении пояснительной записки.
- Why:
  - Требовалась единая структурированная основа для быстрого переноса в IDEF0-диаграммы без повторной интерпретации формулировок.
- Files touched:
  - `docs/business-processes/idef0_learning_process_as_is_to_be.md`
- Next step:
  - На основе документа построить графические схемы `A0` и декомпозированные диаграммы (`A1..A5`, `A1..A6`) в выбранном инструменте моделирования.

## Entry: 2026-02-25 (idef0 drawing blueprint for diagram tools)
- Date: 2026-02-25
- Task: Подготовить практический шаблон для быстрого переноса IDEF0-модели в draw.io/Visio.
- Decision/Change:
  - Добавлен blueprint-документ с готовыми подписями стрелок, межблочными потоками и порядком отрисовки.
  - Для AS-IS и TO-BE отдельно зафиксированы:
    - контекстные диаграммы `A0`,
    - декомпозиции,
    - внешние I/C/M/O по каждому блоку,
    - внутренние потоки между функциями.
- Why:
  - Пользователю нужен формат «сразу в схему», чтобы не извлекать ICOM вручную из описательного текста.
- Files touched:
  - `docs/business-processes/idef0_diagram_blueprint.md`
- Next step:
  - Использовать blueprint как чек-лист при сборке финальных IDEF0-диаграмм в графическом редакторе.

## Entry: 2026-02-25 (thesis figures 5-10 templates)
- Date: 2026-02-25
- Task: Подготовить заготовки для схем ВКР (рисунки 5-10): CJM, персона, UML Use Case, C4 Context, алгоритм, C4 Container.
- Decision/Change:
  - Создан единый документ с готовыми материалами для отрисовки:
    - сравнительный CJM (AS-IS/TO-BE),
    - портрет целевой аудитории,
    - UML Use Case (в формате Mermaid),
    - контекстная диаграмма C4,
    - алгоритм прохождения урока,
    - контейнерная диаграмма C4 со стеком и интеграциями.
- Why:
  - Пользователю нужны сразу пригодные шаблоны для визуализации без повторной аналитической подготовки.
- Files touched:
  - `docs/business-processes/figures_05_10_specs.md`
- Next step:
  - Перенести блоки в выбранный редактор и привести подписи/стили к требованиям оформления ВКР.

## Entry: 2026-02-25 (focused CJM-only artifact)
- Date: 2026-02-25
- Task: Подготовить отдельный документ только с CJM по запросу пользователя.
- Decision/Change:
  - Создан отдельный файл с сравнительной CJM-таблицей AS-IS vs TO-BE.
  - Добавлены эмоциональная динамика и набор ключевых метрик для подписи/анализа.
- Why:
  - Пользователю нужен только CJM, без дополнительных типов схем.
- Files touched:
  - `docs/business-processes/cjm_as_is_to_be.md`
- Next step:
  - Перенести таблицу в визуальный шаблон CJM и адаптировать под стиль ВКР.

## Entry: 2026-02-25 (expanded target audience portrait)
- Date: 2026-02-25
- Task: Расширить портрет целевой аудитории для ВКР.
- Decision/Change:
  - Существенно расширен раздел "Рисунок 6 - Портрет целевой аудитории" в документе схем:
    - primary и secondary persona,
    - сегментация аудитории,
    - JTBD,
    - измеримые критерии успеха,
    - UX-требования для аудитории 55+.
  - Добавлен отдельный автономный документ с расширенным портретом для удобной вставки в пояснительную записку.
- Why:
  - Пользователю нужен более детализированный и академически обоснованный портрет аудитории.
- Files touched:
  - `docs/business-processes/figures_05_10_specs.md`
  - `docs/business-processes/target_audience_portrait_expanded.md`
- Next step:
  - Использовать сокращенную версию для подписи рисунка и расширенную версию для аналитической части главы.

## Entry: 2026-02-25 (architecture hardening pass)
- Date: 2026-02-25
- Task: Закрыть архитектурные слабые места: transaction boundaries, policy-driven auth checks, observability/security middleware.
- Decision/Change:
  - **Transaction boundary centralized**
    - `app/shared/db/deps.py`: `get_db()` now commits after successful request and rolls back on exception.
    - Removed explicit `self.db.commit()` calls from domain services (`auth`, `catalog`, `simulation`) to avoid scattered transaction control.
  - **Policy-driven authorization**
    - Added `app/shared/auth/policies.py` with `POLICY_ROLE_MAP`.
    - Added `require_policy(policy_key)` in `app/shared/auth/deps.py`.
    - Migrated `catalog` and `simulation` routers from raw role tuples to policy keys.
  - **Observability & security headers**
    - `LoggingMiddleware` now creates/propagates `X-Request-ID`, logs request_id, and returns it in response headers.
    - Added `SecurityHeadersMiddleware` (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
    - Registered middleware in `app/main.py`.
  - **Validation tests for new behavior**
    - Added `tests/test_middleware_headers.py` to verify request-id and security headers.
- Validation:
  - `ruff check` on all changed files -> passed.
  - `mypy app/ --ignore-missing-imports` -> passed.
  - `PYTHONPATH=. pytest --cov=app --cov-report=term --cov-fail-under=82 -q` -> passed.
  - Total coverage after changes: 94.00%.

## Entry: 2026-02-25 (full branch coverage push beyond 90%)
- Date: 2026-02-25
- Task: Максимально допокрыть backend, включая ранее почти непокрытые API/payload/model ветки.
- Decision/Change:
  - Добавлены тесты:
    - `backend/tests/test_model_registry.py` (закрыт `app/models.py`),
    - `backend/tests/test_catalog_payloads.py` (полный discriminator coverage для `catalog/api/payloads.py`),
    - `backend/tests/test_auth_api_router_branches.py` (success/error mapping auth router, включая rate-limited handlers),
    - `backend/tests/test_catalog_api_router_branches.py` (success/error mapping catalog router),
    - `backend/tests/test_simulation_service_helpers.py` (helper/edge branches simulation domain service).
  - Существенно повышено покрытие low-coverage зон:
    - `app/models.py`: 0% -> 100%
    - `catalog/api/payloads.py`: 0% -> 100%
    - `auth/api/router.py`: 71% -> 98%
    - `catalog/api/router.py`: 77% -> 100%
    - `simulation/domain/services.py`: 69% -> 90%
- Validation:
  - `PYTHONPATH=. pytest --cov=app --cov-report=term --cov-fail-under=82 -q` -> passed.
  - Итоговое покрытие: 93.93%.

## Entry: 2026-02-25 (simulation domain branch coverage boost)
- Date: 2026-02-25
- Task: Поднять покрытие `simulation/domain/services.py` до 80%+ и увеличить общий запас над CI gate.
- Decision/Change:
  - Добавлен файл `backend/tests/test_simulation_service_helpers.py` с фокусом на low-coverage ветки:
    - helper-функции нормализации/валидации,
    - extraction logic (`_extract_library_binding`, `_extract_library_metadata`, `_count_library_links`),
    - error-path ветки `create_media_asset` (включая cleanup при исключении),
    - фильтрация `list_library_items` по binding-полям.
- Validation:
  - `PYTHONPATH=. pytest tests/test_simulation_service_helpers.py -q` -> passed.
  - `PYTHONPATH=. pytest --cov=app --cov-report=term --cov-fail-under=82 -q` -> passed.
  - Coverage improvements:
    - `simulation/domain/services.py`: 69% -> 90%
    - total backend coverage: 84.93% -> 88.58%

## Entry: 2026-02-25 (repository-level coverage uplift to 82% gate)
- Date: 2026-02-25
- Task: Поднять покрытие выше 80% и зафиксировать более строгий CI coverage threshold.
- Decision/Change:
  - Добавлены unit tests для repository-слоя:
    - `backend/tests/test_auth_repository.py`
    - `backend/tests/test_catalog_repository.py`
    - `backend/tests/test_simulation_repository.py`
  - Покрыты query/mutation ветки и state transitions в auth/catalog/simulation repositories.
  - CI coverage threshold увеличен:
    - `.github/workflows/ci.yml` -> `--cov-fail-under=82`.
- Validation:
  - `PYTHONPATH=. pytest --cov=app --cov-report=term --cov-fail-under=82 -q` -> passed.
  - Итоговое покрытие: 84.93%.

## Entry: 2026-02-25 (simulation api contract coverage uplift)
- Date: 2026-02-25
- Task: Довести общий backend coverage в диапазон 78-80% без искусственных исключений.
- Decision/Change:
  - Добавлен suite `backend/tests/test_api_simulation_contract.py` с контрактными проверками happy-path/negative-path для simulation API.
  - Покрыты ветки `simulation/api/router.py`:
    - drafts current/get+upsert,
    - media list/apps/upload/file/rename/delete,
    - library list/create/get/update/delete,
    - 200/201/204 и 404/422 сценарии.
  - Обновлён CI coverage gate:
    - `.github/workflows/ci.yml` -> `--cov-fail-under=78`.
- Validation:
  - `PYTHONPATH=. pytest tests/test_api_simulation_contract.py tests/test_api_rbac_contract.py -q` -> passed.
  - `PYTHONPATH=. pytest --cov=app --cov-report=term --cov-fail-under=78 -q` -> passed.
  - Итоговое покрытие: 78.59%.

## Entry: 2026-02-25 (next-step audit improvements: role matrix + coverage gate)
- Date: 2026-02-25
- Task: Выполнить следующий этап quality-аудита: расширить role-aware API тесты и добавить coverage gate в CI.
- Decision/Change:
  - Добавлен/расширен suite `backend/tests/test_api_rbac_contract.py`:
    - role matrix для write/read endpoint'ов `catalog` и `simulation`,
    - строгая проверка контрактов `auth/me` и `auth/login`.
  - В `tests/conftest.py` добавлены reusable fixtures для dependency override и генерации actor по роли.
  - Включён coverage gate:
    - `backend/requirements-dev.txt` -> `pytest-cov`,
    - `.github/workflows/ci.yml` -> `pytest --cov=app --cov-report=term --cov-fail-under=75`.
- Validation:
  - `ruff check` по изменённым тестам -> passed.
  - `mypy app/ --ignore-missing-imports` -> passed.
  - `PYTHONPATH=. pytest --cov=app --cov-report=term --cov-fail-under=75 -q` -> passed.
  - Итоговое покрытие: 75.50% (порог 75% выполнен).

## Entry: 2026-02-25 (rbac matrix and strict api contract tests)
- Date: 2026-02-25
- Task: Усилить API тесты за счет role-matrix проверок и строгих контрактных ассертов.
- Decision/Change:
  - Добавлен новый suite `backend/tests/test_api_rbac_contract.py`.
  - Покрыта role-matrix для защищенных endpoint'ов:
    - `GET /api/v1/catalog/courses/{course_id}/releases` (admin/methodologist/moderator -> 200, user -> 403)
    - `GET /api/v1/simulation/drafts/current` (admin/methodologist -> 200, moderator/user -> 403)
  - Добавлены строгие контракты ответов:
    - `GET /api/v1/auth/me` проверка полного набора полей и типов.
    - `GET /api/v1/health/db` проверка структуры `{status, database}`.
  - В `tests/conftest.py` добавлены reusable fixtures:
    - `dependency_overrider` для безопасного dependency override,
    - `actor_factory` для генерации `CurrentActor` по роли.
- Validation:
  - `ruff check tests/conftest.py tests/test_api_rbac_contract.py tests/test_api_auth.py tests/test_api_catalog.py tests/test_api_simulation.py` -> passed.
  - `PYTHONPATH=. pytest tests/test_api_rbac_contract.py tests/test_api_auth.py tests/test_api_catalog.py tests/test_api_simulation.py -q` -> passed.
  - `PYTHONPATH=. pytest -q` -> passed.

## Entry: 2026-02-25 (backend hardening: cors + rollback + rate limits)
- Date: 2026-02-25
- Task: Закрыть audit-замечания P1 по безопасности и отказоустойчивости backend.
- Decision/Change:
  - Добавлен централизованный limiter `backend/app/shared/security/rate_limit.py` и применён к auth endpoint'ам:
    - `/auth/otp/request` -> `5/minute`
    - `/auth/otp/verify` -> `10/minute`
    - `/auth/login` -> `10/minute`
    - `/auth/qr/activate` -> `10/minute`
    - `/auth/refresh` -> `20/minute`
  - Усилен CORS configuration через env:
    - `APP_CORS_ORIGINS` добавлен в `Settings` и `.env.template`.
    - В production запрещён wildcard (`*`).
    - В `main.py` `allow_credentials` автоматически отключается для wildcard origins.
  - Добавлен auto-rollback в DB dependency (`get_db`) при исключениях.
- Validation:
  - `ruff check` по изменённым backend-файлам -> passed.
  - `mypy app/ --ignore-missing-imports` -> passed.
  - `PYTHONPATH=. pytest -v --tb=no` -> passed.

## Entry: 2026-02-25 (api contract assertions hardening)
- Date: 2026-02-25
- Task: Ужесточить интеграционные API-тесты после базового покрытия.
- Decision/Change:
  - В `test_api_auth.py` добавлены проверки структуры успешного OTP-ответа и `detail` в ошибках auth endpoint'ов.
  - В `test_api_catalog.py` добавлены проверки формы payload для публичных ответов и error-detail для защищенных endpoint'ов.
  - В `test_api_simulation.py` добавлены проверки `detail` для unauthorized сценариев и кейс на PATCH library endpoint без авторизации.
- Validation:
  - `PYTHONPATH=. pytest tests/test_api_auth.py tests/test_api_catalog.py tests/test_api_simulation.py -v --tb=short` -> 28 passed.
  - `PYTHONPATH=. pytest -v --tb=no` -> 166 passed, 2 skipped.

## Entry: 2026-02-25 (backend API test coverage expansion)
- Date: 2026-02-25
- Task: Расширить покрытие API-уровня backend (auth/catalog/simulation) и стабилизировать интеграционные проверки.
- Decision/Change:
  - Добавлены отдельные интеграционные test suites:
    - `backend/tests/test_api_auth.py`
    - `backend/tests/test_api_catalog.py`
    - `backend/tests/test_api_simulation.py`
  - Добавлен общий fixture `api_client` в `backend/tests/conftest.py` для единообразного TestClient setup.
  - Тесты спроектированы как контрактные проверки доступности endpoint'ов, базовой валидации и auth-границ (public/protected).
  - Приведены ожидания статусов к фактическому API-контракту (например, phone в OTP может проходить нормализацию).
- Validation:
  - `PYTHONPATH=. pytest tests/test_api_integration.py tests/test_api_auth.py tests/test_api_catalog.py tests/test_api_simulation.py -v --tb=short` -> 33 passed.
  - `PYTHONPATH=. pytest -v --tb=no` -> 164 passed, 2 skipped.
  - `mypy app/ --ignore-missing-imports` -> passed.

## Entry: 2026-02-13 (simulation v2 persistent connection overlay positioning fix)
- Date: 2026-02-13
- Task: Линия связи продолжала отображаться «поверх всего» и визуально залипала при изменении layout (ресайз панелей/предпросмотр).
- Root cause:
  - Постоянные связи (`persistentConnections`) рендерились как `position: fixed` на весь viewport с очень высоким `z-index`, поэтому не были привязаны к области canvas и пересекали модальные слои.
  - Координаты точек считались в screen-space, что усиливало визуальные артефакты при сдвиге layout.
- Decision/Change:
  - Перевёл рендер постоянных связей в canvas-space:
    - добавлен `toCanvasPoint(...)` для перевода координат из screen-space в локальные координаты canvas.
    - путь и точки persistent-связей строятся по локальным координатам.
  - В CSS:
    - `.canvas` получил `overflow: hidden`,
    - `.persistentConnections` переведён с `fixed` на `absolute` (`inset: 0`, `width/height: 100%`) и понижен по `z-index`.
- Files:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `web/src/features/simulation/ui/editor/SimulationEditor.module.css`
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 only + thumbnail fullscreen preview + library delete scope)
- Date: 2026-02-13
- Task:
  - убрать старый редактор из навигации и использовать только новый,
  - добавить полноэкранный предпросмотр миниатюр экранов,
  - разрешить удаление сценария только в разделе «Все сценарии»,
  - поправить иконку «добавить приложение».
- Decision/Change:
  - Навигация переведена на новый редактор:
    - `dashboard` и `catalog-write-panel` теперь ведут на `/simulation-v2`.
    - `/simulation` теперь делает redirect на `/simulation-v2` с сохранением scope-параметров.
    - из `SimulationEditor` убрана ссылка «Старый редактор».
  - В `SimulationEditor` добавлен полноэкранный image preview overlay:
    - открытие по клику на превью выбранного экрана в свойствах,
    - открытие по двойному клику по миниатюрам в сетке экрана,
    - закрытие по `Esc` и по кнопке/клику на фон.
  - В `AppMediaTab` добавлен callback preview и открытие fullscreen preview по клику на миниатюры экранов (в списке версий и в модалке добавления/редактирования).
  - Иконка `Добавить приложение` заменена с текстового `+` на выровненную SVG-иконку.
  - В `LibraryTab` удаление сценариев ограничено разделом «Все сценарии»:
    - в quick-списке кнопка удаления не отображается,
    - в модалке «Все сценарии» удаление сохранено.
- Files:
  - `web/app/simulation/page.tsx`
  - `web/app/simulation-v2/page.tsx`
  - `web/app/dashboard/page.tsx`
  - `web/src/features/catalog/components/catalog-write-panel.tsx`
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `web/src/features/simulation/ui/editor/SimulationEditor.module.css`
  - `web/src/features/simulation/ui/editor/panels/AppMediaTab.tsx`
  - `web/src/features/simulation/ui/editor/panels/AppMediaTab.module.css`
  - `web/src/features/simulation/ui/editor/panels/LibraryTab.tsx`
  - `web/src/features/simulation/ui/simulation-builder.tsx`
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 bilateral panel resize without toggle button)
- Date: 2026-02-13
- Task: Убрать кнопку разворота/сворачивания левой панели и добавить аналогичный resize для правой панели свойств.
- Decision/Change:
  - Удалена кнопка `sidebarExpandButton` у левого меню.
  - Левый блок остаётся с drag-resize по правой границе (`220px..460px`).
  - Правая панель свойств переведена в `propertiesContainer` с динамической шириной и drag-resize по левой границе (`240px..460px`).
  - Добавлены отдельные состояния/refs для resize правой панели, с единым поведением курсора `col-resize` и блокировкой выделения текста во время drag.
- Files:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `web/src/features/simulation/ui/editor/SimulationEditor.module.css`
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 library delete icon on scenario cards)
- Date: 2026-02-13
- Task: Добавить в библиотеке сценариев иконку удаления в правом верхнем углу карточки.
- Decision/Change:
  - В `LibraryTab` добавлена action-иконка удаления (корзина) в правом верхнем углу каждой карточки сценария.
  - Добавлен flow удаления:
    - подтверждение удаления (`confirm`),
    - вызов `deleteSimulationLibraryItemRemote(itemId)`,
    - обновление quick-списка и списка в модальном окне.
  - Добавлены локализованные статусы/ошибки удаления и состояния кнопки удаления.
  - Добавлены стили для `cardHeaderActions` и `deleteCardButton`.
- Files:
  - `web/src/features/simulation/ui/editor/panels/LibraryTab.tsx`
  - `web/src/features/simulation/ui/editor/panels/LibraryTab.module.css`
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 resizable left tools panel)
- Date: 2026-02-13
- Task: Добавить возможность расширять левое меню в редакторе симуляций.
- Decision/Change:
  - Левая панель инструментов переведена в контейнер с динамической шириной.
  - Добавлена кнопка быстрого разворота/сворачивания ширины (`220px <-> 320px`).
  - Добавлен resize-handle по правой границе панели с drag-изменением ширины (`220px..460px`).
  - Во время resize включается `col-resize` курсор и блокируется выделение текста для стабильного UX.
- Files:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `web/src/features/simulation/ui/editor/SimulationEditor.module.css`
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 scenario library iconography polish)
- Date: 2026-02-13
- Task: Добавить иконки в блок «Библиотека сценариев» для улучшения читаемости действий и карточек.
- Decision/Change:
  - В `LibraryTab` добавлены SVG-иконки для кнопок действий:
    - «Сохранить весь холст»
    - «Сохранить выделенное»
    - «Все сценарии»
    - «Добавить на холст».
  - Поиск сценариев переведён на поле с префикс-иконкой лупы (в основной панели и модальном окне).
  - Карточка сценария дополнена иконками для версии, экранов и связей.
  - Обновлены стили `LibraryTab.module.css` для единых icon+label паттернов и компактного визуального ритма.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 square corner resize markers)
- Date: 2026-02-13
- Task: Сделать угловые resize-маркеры в стиле контура зоны без скругления.
- Decision/Change:
  - Угловые L-маркеры переведены в квадратный вид (`border-radius: 0`), без радиусов по углам.
  - Сохранил текущую геометрию и толщину линий, чтобы маркеры визуально совпадали с контурной стилистикой зоны.
- Validation:
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 resize guide spacing tuning)
- Date: 2026-02-13
- Task: Уточнить геометрию resize-гайдов:
  - уменьшить зазор между зоной и `grip`,
  - убрать внутреннее отображение рисочек,
  - сделать угловые маркеры менее закруглёнными.
- Decision/Change:
  - `hotspotGrip.top` изменён с `-20px` на `-16px`.
  - Side-guides и corner-guides сдвинуты обратно наружу зоны (`-4/-5px` offsets).
  - Corner-guide radius уменьшен (`4px`) для менее «круглого» вида.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 corner-only guides + top overlap fix)
- Date: 2026-02-13
- Task: Доработать визуал resize-гайдов:
  - при угловом resize не показывать боковые рисочки,
  - убрать пересечение верхнего гайда с `grip`.
- Decision/Change:
  - Для угловых handle side-гайды отключены полностью (`resolveResizeGuideSides` возвращает пусто для `nw/ne/se/sw`).
  - Оставлен только угловой маркер и он сделан более скруглённым.
  - `grip` поднят выше (`top: -20px`), верхние/боковые гайды смещены ближе к внутренней рамке зоны.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 single-side resize guide rendering)
- Date: 2026-02-13
- Task: Показывать визуальные «рисочки» только для текущей стороны/угла resize.
- Decision/Change:
  - В `ScreenNode` для `hotspotResizeCursor` добавлен активный `handle`.
  - Сайд-гайды (`top/right/bottom/left`) теперь рендерятся только по активному handle, а не все одновременно.
  - Для углов добавлен отдельный L-маркер (`resizeCornerGuideNw/Ne/Se/Sw`), показывается только при угловом resize.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 resize edge guides)
- Date: 2026-02-13
- Task: Добавить визуальные «рисочки» при resize без возврата точек-хэндлов.
- Decision/Change:
  - В `ScreenNode` расширено состояние `hotspotResizeCursor` (добавлен `handle`).
  - При наведении на resize-границу и во время resize показываются короткие направляющие линии по сторонам зоны.
  - Активные стороны для текущего handle подсвечиваются интенсивнее (`resizeGuideActive`).
  - Точки-хэндлы остаются отключёнными; resize по-прежнему только через границы.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 border-resize without visible handles)
- Date: 2026-02-13
- Task: Убрать точки resize и оставить resize только через границы зоны.
- Decision/Change:
  - В `ScreenNode` удалены визуальные resize handles.
  - Resize остаётся только по border hit-test (`RESIZE_EDGE_THRESHOLD_PX = 8`) у выделенной зоны.
  - Добавлен динамический курсор на границе зоны (`ns/ew/nwse/nesw`) через `detectResizeHandle` + `cursorForResizeHandle`.
  - Вне границы drag по телу зоны остаётся действием создания связи; перемещение — только через верхний `grip`.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 hotspot drag semantics adjusted)
- Date: 2026-02-13
- Task: Изменить UX взаимодействия с зоной по уточнению пользователя:
  - drag зоны по телу = создание связи,
  - перемещение зоны = только за верхний `grip`,
  - точки resize показывать только при фактическом resize.
- Decision/Change:
  - В `ScreenNode` разделены жесты:
    - body pointer-down запускает link drag (`onHotspotDragStart`),
    - move доступен только через верхнюю полоску (`hotspotGrip`).
  - Resize запускается drag-ом от границы зоны (детект edge/corner hit-test), минимальный размер остаётся `2x2 px`.
  - Resize handles теперь рендерятся только в момент активного resize (`activeResizeHotspotId`), а не постоянно.
  - В `SimulationEditor` возвращён порог клика для link drag (`HOTSPOT_LINK_DRAG_THRESHOLD_PX = 6`), чтобы обычный клик по зоне не давал ложный дроп-хинт.
  - Обновлён текст подсказки в верхней панели под новый UX.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 unified hotspot editing UX)
- Date: 2026-02-13
- Task: Переработать UX зон в редакторе симуляций:
  - точное создание маленьких зон,
  - полноширинный скриншот в ноде без боковых полей,
  - перемещение/resize существующих зон,
  - единый режим взаимодействия с пороговым переходом в создание связи.
- Decision/Change:
  - `ScreenNode` переведён на unified interactions:
    - drag по пустой области скриншота -> создание новой зоны,
    - drag по зоне/грипу -> перемещение,
    - 8 внешних ручек (`8x8`) -> resize,
    - минимальный размер зоны: `2x2 px`.
  - Для создания связи добавлен жестовый переход:
    - при перемещении зоны, если курсор выходит за границу зоны более чем на `12px`, включается flow создания связи (drag-preview и drop на экран).
  - Скриншоты в нодах переведены на динамическую высоту по aspect ratio:
    - ширина изображения = ширина ноды,
    - убраны боковые поля внутри превью.
  - Удалён режимный toggle рисования/выбора в тулбаре:
    - UX теперь однотипный, подсказка обновлена на единый сценарий.
  - Скорректирован расчёт `sourceY` для отображения persistent-связей с учётом header ноды.
- Why:
  - Пользователю было неудобно размечать маленькие интерактивные элементы, редактировать существующие зоны и работать с текущим режимным UX.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 hotspot selection and connection UX polish)
- Date: 2026-02-13
- Task: Исправить поведение зон и связей в новом редакторе симуляций:
  - свойства зоны открываются по клику,
  - временные/постоянные линии не перекрывают модальное окно,
  - убрать отладочные координаты из правой панели,
  - показывать весь скриншот экрана без обрезки,
  - выровнять стиль линии перетаскивания зоны со стилем существующих связей.
- Decision/Change:
  - В `ScreenNode` добавлен явный выбор зоны по клику (`onHotspotSelect`) и выбор по `pointerdown`.
  - Порог различения «клик vs drag» увеличен до `10px`, чтобы избежать ложных перетаскиваний.
  - В `SimulationEditor` скрываются persistent-линии и preview-линия при открытой модалке добавления медиа.
  - Удалён блок отладочных координат `x/y/w/h` из свойств зоны.
  - Для превью перетаскивания зоны вместо прямого `line` используется кривая `path` (единый визуальный стиль связей).
  - Превью экрана переведено на `object-fit: contain`, а hitbox/overlay зон привязан к видимой области изображения (без наложения на пустые поля).
- Why:
  - Пользовательский сценарий был нестабильным: зона выбиралась только при «зажиме», связи просачивались поверх модалки, а обрезка скриншотов и отладочная информация ухудшали UX.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 apps-first flow with modal add)
- Date: 2026-02-13
- Task: Перестроить flow на «список приложений -> раскрытие экранов», а добавление приложения/экранов вынести в модальное окно с затемнением фона.
- Decision/Change:
  - Добавлен backend endpoint списка app-binding для медиатеки:
    - `GET /api/v1/simulation/media/apps` (group by package/store/version/release).
  - Добавлен web proxy:
    - `GET /api/admin/simulation/media/apps`.
  - В новом редакторе (`simulation v2`) блок «Приложение и медиа» перестроен:
    - основной экран: список приложений, раскрытие экранов выбранного приложения;
    - экраны в списке доступны для drag-and-drop на canvas;
    - добавлена кнопка «Добавить приложение и экраны», открывающая модалку поверх затемненного фона.
  - Модалка содержит старый flow:
    - форма app/release (название, пакет, магазин, версии, дата, URL, resolve по URL),
    - загрузка и список экранов по текущему app-binding.
  - Drop на canvas теперь создаёт новый экран в точке дропа и привязывает к текущему сценарию.
- Why:
  - Требование пользователя: убрать перегруженный UX и перейти к apps-first модели с отдельным окном добавления.
- Validation:
  - `cd backend && ruff check ...` (изменённые simulation-файлы) -> passed.
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (simulation v2 ux simplification + media flow + hotspot attach fix)
- Date: 2026-02-13
- Task: Доделать flow нового редактора симуляций: упростить UX, перенести блок приложения/релиза, добавить экран медиа-привязки и исправить перетаскивание зоны к экрану.
- Decision/Change:
  - Новый редактор переведён на единый боковой flow:
    - объединены вкладки `Экраны приложения` и `Медиа` в одну `Приложение и медиа`,
    - табы в сайдбаре переведены на устойчивую сетку (без наложения текста).
  - В новый редактор перенесены ключевые элементы из старого:
    - форма `Приложение и релиз` (название, пакет, магазин, min/max версии, дата релиза, URL магазина),
    - кнопка получения данных приложения из store URL.
  - Добавлен единый медиа-экран для связи приложения и экранов сценария:
    - фильтрация/загрузка медиа по app/release binding,
    - для каждого медиа доступны действия `Добавить экран` и `Назначить выбранному`.
  - Исправлена привязка зоны при перетаскивании:
    - заменено хрупкое попадание по приблизительным координатам на hit-test по реальным DOM-границам `react-flow` узлов,
    - убраны отладочные логи.
  - Исправлено отображение битых изображений в узле:
    - добавлен fallback `Изображение недоступно` вместо наложенного alt-текста.
- Why:
  - Текущий v2-редактор имел дублирующие и запутанные шаги, неявную связь media с app/release и ненадёжную drag-привязку hotspot.
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `web/src/features/simulation/ui/editor/canvas/ScreenNode.tsx`
  - `web/src/features/simulation/ui/editor/panels/ToolsPanel.tsx`
  - `web/src/features/simulation/ui/editor/panels/ToolsPanel.module.css`
  - `web/src/features/simulation/ui/editor/panels/AppMediaTab.tsx` (new)
  - `web/src/features/simulation/ui/editor/panels/AppMediaTab.module.css` (new)
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (fix dashboard return path from simulation editor)
- Date: 2026-02-13
- Task: Исправить навигацию "Назад" из нового редактора экранов и убрать устаревшие переходы на лендинг.
- Decision/Change:
  - Перевёл возврат из нового редактора симуляций на явный путь дашборда:
    - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`: `Назад` -> `/dashboard?lang=...`.
  - Сохранил контекст языка/курса при переключении редакторов:
    - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`: ссылка "Старый редактор" теперь включает `lang` и `courseId` (если есть).
    - `web/src/features/simulation/ui/simulation-builder.tsx`: ссылка "Новый редактор" теперь формируется с `lang`, `version=v2` и `courseId` (если есть).
  - Убрал оставшиеся устаревшие ссылки на `/` в админ-навигации:
    - `web/app/catalog/page.tsx`: ссылка на панель -> `/dashboard?lang=...`.
    - `web/app/dashboard/page.tsx`: переключатель языков теперь остаётся в `/dashboard`.
    - `web/app/simulation/page.tsx` и `web/app/simulation-v2/page.tsx`: redirect при отсутствии прав -> `/dashboard?lang=...`.
- Why:
  - После выделения лендинга в корень `/` старые переходы на `/?lang=...` приводили пользователя не на рабочий дашборд, а на публичную страницу.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed (warnings only, no errors).

## Entry: 2026-02-13 (mobile lesson playback progress by screen index)
- Date: 2026-02-13
- Task: Start mobile backlog implementation for `Lesson Playback Flow` with index-based navigation.
- Decision/Change:
  - Kept existing navigation model by screen index (`Previous` / `Next` / `NavigateToScreen`), without forcing payload-type routing.
  - Added in-session progress persistence in `PlayerViewModel`:
    - save/restore `currentScreenIndex`,
    - save/restore `completedScreens`,
    - key progress by `course.id + release.id`.
  - Progress now restores when the same course/release is reopened from catalog.
  - Progress snapshot now updates on:
    - `Next`,
    - `Previous`,
    - hotspot-driven `NavigateToScreen`,
    - initial `openBundle`.
- Why:
  - User confirmed that lesson flow should continue to use screen-index navigation.
  - MVP backlog requires state transitions with progress saving; this closes core behavior with minimal architectural impact.
- Files touched:
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/player/PlayerViewModel.kt`
  - `.context/operations/work_log.md`
- Validation:
  - `cd mobile && ./gradlew :feature:home:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
- Next step:
  - Move progress persistence from in-memory VM state to durable storage (shared KMP store) for app restarts/offline scenarios.

## Entry: 2026-02-09 (project-wide validation pass + cleanup baseline)
- Date: 2026-02-09
- Task: Validate full project health and identify removable/unused artifacts plus extraction candidates.
- Decision/Change:
  - Validation run results:
    - `backend`: `ruff check .` passed.
    - `backend`: tests pass with `PYTHONPATH=.` (`21 passed`).
    - `web-admin`: `next build` and `npm run type-check` passed.
    - `mobile`: compile targets passed (`:androidApp:compileDebugKotlin`, `:desktopApp:compileKotlinJvm`, `:shared:linkDebugFrameworkIosSimulatorArm64`).
  - Fixed tooling friction:
    - `Makefile` `backend-test` now runs with `PYTHONPATH=.`
    - migrated `web-admin` lint to ESLint 9 flat config:
      - script uses `eslint . --ext .js,.jsx,.ts,.tsx`
      - added `web-admin/eslint.config.mjs`
    - removed one actual unused symbol in simulation builder (`isSimpleScreensStep`).
  - Hardened ignore rules for local/runtime noise:
    - ignored `.claude/`, `.codex/`, `backend/dev.db`, `backend/storage/`, `mobile/.kotlin/`, `test-results/`.
- Why:
  - User requested broad validation and practical cleanup path (what can be removed and what should be extracted).
- Files touched:
  - `Makefile`
  - `.gitignore`
  - `web-admin/package.json`
  - `web-admin/eslint.config.mjs`
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
- Next step:
  - Split oversized files by feature boundaries:
    - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
    - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/ui/player/SimulationScreen.kt`
    - `backend/app/modules/simulation/domain/services.py`

## Entry: 2026-02-09 (architecture approaches documented for mobile KMP)
- Date: 2026-02-09
- Task: Document architecture options for mobile KMP and lock target approach for module placement.
- Decision/Change:
  - Expanded architecture doc with explicit comparison of approaches:
    - monolith shared,
    - layer-first,
    - feature-first,
    - feature-first with `api/impl`,
    - deep split (`ui/domain/data/component`).
  - Fixed target standard as `feature + api/impl` with full Compose Multiplatform UI.
  - Added strict placement rules for:
    - `androidApp`/`iosApp`/`desktopApp` responsibilities,
    - `shared` as thin entry-only layer,
    - `feature:root:impl` as single owner of `NavHost`,
    - dependency/source-set policies.
- Why:
  - User requested clarity on alternative architectures and concrete rules for where each part of mobile app must live.
- Files touched:
  - `mobile/docs/mobile-architecture.md`
- Next step:
  - Implement iOS host bootstrap (`iosApp` Xcode layer + DI/baseUrl wiring) to fully align runtime with documented architecture.

## Entry: 2026-02-09 (mobile module directories renamed to target-style)
- Date: 2026-02-09
- Task: Align `mobile` top-level structure to target naming (`androidApp`, `iosApp`, `desktopApp`).
- Decision/Change:
  - Renamed module directories:
    - `mobile/app` -> `mobile/androidApp`
    - `mobile/desktop` -> `mobile/desktopApp`
  - Updated Gradle includes:
    - `:app` -> `:androidApp`
    - `:desktop` -> `:desktopApp`
  - Added `mobile/iosApp/README.md` as iOS host-layer directory placeholder.
  - Updated architecture and run docs to new names.
  - Validated build with new module paths:
    - `:androidApp:compileDebugKotlin`
    - `:desktopApp:compileKotlinJvm`
    - `:shared:linkDebugFrameworkIosSimulatorArm64`
- Why:
  - User requested explicit platform-oriented directory naming consistent with KMP multi-target layout.
- Files touched:
  - `mobile/settings.gradle.kts`
  - `mobile/README.md`
  - `mobile/docs/mobile-architecture.md`
  - `mobile/androidApp/**` (moved from `mobile/app/**`)
  - `mobile/desktopApp/**` (moved from `mobile/desktop/**`)
  - `mobile/iosApp/README.md`
- Next step:
  - If needed, create real Xcode host project files under `mobile/iosApp/` and wire `Shared.framework` automatically.

## Entry: 2026-02-09 (mobile KMP root feature extraction)
- Date: 2026-02-09
- Task: Align `mobile` architecture with shared-first KMP approach while keeping strict feature modularity.
- Decision/Change:
  - Added new module `feature:root:impl` as a dedicated composition root for shared navigation/session bootstrap.
  - Moved root navigation graph from `shared` into `feature/root/impl/navigation/RootNavHost.kt`.
  - Moved session bootstrap logic into `feature/root/impl/RootRoute.kt`.
  - Reduced `shared` to a thin entry wrapper (`DigitalEduApp`) that delegates to `RootRoute`.
  - Updated architecture docs and README to reflect target structure and placement rules.
  - Added `coverImageUrl` to `CatalogCourse` and wired backend fields (`cover_url`/`photo_url`/`image_url`) with id-based fallback image (no slug-based fallback).
- Why:
  - User requested strict separation: no screen implementation inside `NavHost` and clear feature ownership for root graph.
  - Needed a scalable structure similar to `Shopping-By-KMP` but without monolithic shared module.
- Files touched:
  - `mobile/settings.gradle.kts`
  - `mobile/feature/root/impl/build.gradle.kts`
  - `mobile/feature/root/impl/src/commonMain/kotlin/com/digitaledu/feature/root/impl/RootRoute.kt`
  - `mobile/feature/root/impl/src/commonMain/kotlin/com/digitaledu/feature/root/impl/navigation/RootNavHost.kt`
  - `mobile/shared/src/commonMain/kotlin/com/digitaledu/shared/DigitalEduApp.kt`
  - `mobile/shared/src/commonMain/kotlin/com/digitaledu/shared/navigation/AppNavHost.kt` (deleted)
  - `mobile/shared/build.gradle.kts`
  - `mobile/docs/mobile-architecture.md`
  - `mobile/README.md`
  - `mobile/core/model/src/commonMain/kotlin/com/digitaledu/core/model/CatalogBundle.kt`
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/ktor/KtorCatalogNetworkDataSource.kt`
  - `mobile/core/network/src/jvmMain/kotlin/com/digitaledu/core/network/retrofit/RetrofitCatalogNetworkDataSource.kt`
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/ui/CoursesContent.kt`
  - `.context/architecture/kmp_migration.md`
- Next step:
  - Validate KMP compile for Android/Desktop/iOS shared targets and then move root contracts to `feature:root:api` if public exposure is needed.

## Entry: 2026-02-10 (fix simulation library 500 on migration apply)
- Date: 2026-02-10
- Task: Resolve `500 Internal Server Error` in simulation library caused by failed DB migration.
- Decision/Change:
  - Identified migration failure root cause:
    - Alembic revision id `0007_add_simulation_library_items` exceeded `alembic_version.version_num` length (`varchar(32)`).
  - Renamed migration revision id to shorter value:
    - `0007_simulation_library_items`.
  - Re-ran migration successfully to head.
- Why:
  - Until migration reached head, backend had library endpoints but DB schema without library table, causing runtime 500.
- Files touched:
  - `backend/migrations/versions/0007_add_simulation_library_items.py`
- Next step:
  - Keep future Alembic revision ids at `<=32` chars (or switch to compact hash-like ids) to avoid repeated apply failures.

## Entry: 2026-02-09 (phone-sized simulation previews in Safari)
- Date: 2026-02-09
- Task: Fix oversized/non-phone-like simulation screen rendering in Safari for media cards and editor preview.
- Decision/Change:
  - Reworked screen preview rendering to use a stable phone-frame ratio fallback (not only `aspect-ratio`):
    - added frame wrappers with pseudo-element ratio lock (`padding-top: 216.67%`) for media previews,
    - switched editor/preview stages to fixed phone-width constraints with the same ratio fallback,
    - made images absolutely positioned inside frame to always render full image (`object-fit: contain`).
  - Reduced default visual size so screen cards look like mobile displays, not oversized canvases.
- Why:
  - In Safari, ratio behavior could produce oversized previews; fallback layout ensures consistent mobile-like display across browsers.
- Files touched:
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
- Next step:
  - If needed, add a user-facing zoom switch (`100% / 85% / 70%`) for operators working on small laptop screens.

## Entry: 2026-02-09 (simulation library save/load)
- Date: 2026-02-09
- Task: Add reusable simulation library in web-admin builder with backend persistence.
- Decision/Change:
  - Added backend entity/table `simulation_library_items` with migration `0007_add_simulation_library_items`.
  - Added simulation library API:
    - `GET /api/v1/simulation/library`
    - `POST /api/v1/simulation/library`
    - `GET /api/v1/simulation/library/{item_id}`
    - `DELETE /api/v1/simulation/library/{item_id}`
  - Added web-admin proxy routes for library list/create/get/delete under `/api/admin/simulation/library`.
  - Added library client API in web-admin simulation module and connected it to builder UI.
  - Added new collapsible block “Библиотека симуляций” in the builder:
    - save current scenario to library (`save as new`),
    - update selected saved scenario (`update existing`),
    - search/list saved scenarios,
    - load scenario back into editor,
    - delete saved scenario.
- Why:
  - User needs fast reuse of prepared simulation scenarios across courses without rebuilding flows from scratch.
- Files touched:
  - `backend/app/modules/simulation/infra/models.py`
  - `backend/app/modules/simulation/infra/repository.py`
  - `backend/app/modules/simulation/domain/services.py`
  - `backend/app/modules/simulation/api/schemas.py`
  - `backend/app/modules/simulation/api/router.py`
  - `backend/migrations/versions/0007_add_simulation_library_items.py`
  - `backend/tests/test_simulation_schemas.py`
  - `web-admin/src/shared/server/backend-admin-proxy.ts`
  - `web-admin/app/api/admin/simulation/library/route.ts`
  - `web-admin/app/api/admin/simulation/library/[itemId]/route.ts`
  - `web-admin/src/features/simulation/api/client.ts`
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
- Next step:
  - Add explicit “Save as new / Update existing” mode and tags/folders for library organization if scenario volume grows.

## Entry: 2026-02-09 (store resolver accuracy + icon clamp)
- Date: 2026-02-09
- Task: Fix incorrect app-name extraction from store links and stabilize app-icon preview size in simulation builder.
- Decision/Change:
  - Refactored `store/resolve` parser:
    - added JSON-LD app-name extraction (`application/ld+json`) with app-type filtering,
    - added robust store-specific title cleanup for Google Play / RuStore / App Store,
    - added candidate-based name selection to avoid store-shell titles (`... Google Play`, `... RuStore`, `... App Store`),
    - added Google Play retry candidates with `hl=en` + `gl=US` fallback to reduce 404 cases.
  - Hardened target-app icon UI sizing:
    - added strict min/max width/height clamp (`36x36`) and display enforcement in identity row.
  - Validated behavior with local API calls and Playwright:
    - Google Play -> `Telegram`,
    - RuStore -> `ВТБ Онлайн`,
    - App Store -> `Telegram Messenger`,
    - icon preview rendered as `36x36`.
- Why:
  - Previous extraction often returned store-page wrapper titles instead of actual app names.
  - Reported UI regressions showed icon scaling instability in authoring flow.
- Files touched:
  - `web-admin/app/api/admin/simulation/store/resolve/route.ts`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
- Next step:
  - If needed, add optional store-search endpoint (`app name -> candidate store links`) to remove manual package/store URL discovery from UX.

## Entry: 2026-02-09 (safari-safe icon rendering hardening)
- Date: 2026-02-09
- Task: Eliminate Safari-specific oversized app icon rendering in target-app row.
- Decision/Change:
  - Added inline hard size constraints directly on app icon element (`width/height/min/max/aspect-ratio/object-fit`) in JSX.
  - Added `targetAppIdentityInput` flex rule to keep name input stable when icon is present.
  - Rechecked with Playwright WebKit: icon remains `36x36`, row layout remains stable.
- Why:
  - Some Safari sessions may ignore/conflict CSS module styles (cache/engine quirks), so inline constraints ensure predictable rendering.
- Files touched:
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
- Next step:
  - If issue reproduces on specific Safari build, capture exact Safari version and installed extensions to isolate external CSS overrides.

## Entry: 2026-02-09 (ruStore 429 challenge poisoning fix)
- Date: 2026-02-09
- Task: Prevent `Ошибка 429` / challenge payloads from polluting target-app fields in simulation builder.
- Decision/Change:
  - Added Rustore API-first resolver path (`backapi.rustore.ru/applicationData/overallInfo/<package>`) before HTML scraping.
  - Added challenge/429 detection hardening in backend resolver (`error 4xx`, `ошибка 4xx`, challenge markers).
  - Added draft sanitization on load in UI:
    - clears corrupted `appName`/`iconUrl`/`storeUrl` values if they look like challenge/429 artifacts.
  - Added Safari-safe row layout hardening with inline grid constraints for icon + input.
- Why:
  - RuStore frequently serves anti-bot pages; those responses were persisted into authoring draft and degraded UX.
- Files touched:
  - `web-admin/app/api/admin/simulation/store/resolve/route.ts`
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
- Next step:
  - Add manual “Очистить данные приложения” action in UI to recover from any future bad metadata in one click.

## Entry: 2026-02-09 (simulation builder store-resolver UX)
- Date: 2026-02-09
- Task: Simplify simulation-builder app targeting flow and remove overloaded final-screen control.
- Decision/Change:
  - Added server-side store page resolver endpoint:
    - `POST /api/admin/simulation/store/resolve`
    - supports Google Play, RuStore, App Store links,
    - extracts app title from page metadata (`og:title`/`title`),
    - extracts app icon (`og:image`/icon link),
    - resolves technical app identifier with fallback generation.
  - Added App Store support to simulation domain/UI store types (`app_store`).
  - Updated target-app UX in simulation builder:
    - app name stays editable manually,
    - URL action now fetches data from store page (not URL slug),
    - app icon preview shown near app name,
    - package name remains hidden from operator UI.
  - Refactored completion marking:
    - removed completion checkbox from center screen form,
    - completion is now toggled from the left screen list.
  - Kept compatibility for media binding by preserving valid package format for all stores (including synthetic `appstore.id<id>`).
- Why:
  - URL-only parsing produced incorrect app names and reduced trust in authoring flow.
  - Moving completion action into the screen list lowers cognitive load and matches the object-level action model.
- Files touched:
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
  - `web-admin/src/features/simulation/api/client.ts`
  - `web-admin/src/features/simulation/model/types.ts`
  - `web-admin/src/features/simulation/model/factories.ts`
  - `web-admin/src/features/simulation/model/validation.ts`
  - `web-admin/app/api/admin/simulation/store/resolve/route.ts`
  - `web-admin/app/api/admin/simulation/media/route.ts`
  - `backend/app/modules/simulation/domain/services.py`
- Next step:
  - Add optional store search helper (name -> candidate links) and expose manual override for resolved icon if store metadata is missing.

## Entry: 2026-02-05
- Date: 2026-02-05
- Task: Complete quality gates setup verification and continue catalog development with release filters.
- Decision/Change:
  - Added backend release filters for `GET /api/v1/catalog/courses/{course_id}/releases`:
    - `status` (`draft|published`)
    - `version_query` (trimmed substring match)
    - `limit` (1..200, default 50)
  - Wired filters into web-admin catalog page (`/catalog`) through URL query parameters and added filter UI.
  - Added backend unit tests for release query schema validation.
  - Verified local gates: `ruff`, `pytest`, `prettier`, `lint-staged`; installed git pre-commit hook.
- Why:
  - Release history quickly became noisy without filtering.
  - URL-based filters make state shareable and reproducible.
  - Early verification of quality gates reduces integration errors in future commits.
- Files touched:
  - `backend/app/modules/catalog/api/schemas.py`
  - `backend/app/modules/catalog/api/router.py`
  - `backend/app/modules/catalog/domain/services.py`
  - `backend/app/modules/catalog/infra/repository.py`
  - `backend/tests/test_catalog_release_query.py`
  - `web-admin/src/features/catalog/types.ts`
  - `web-admin/src/features/catalog/api.ts`
  - `web-admin/app/catalog/page.tsx`
  - `web-admin/app/catalog/catalog.module.css`
  - `.context/planning/current_focus.md`
- Next step:
  - Replace static `WEB_ADMIN_ACCESS_TOKEN` with web-admin session auth flow and role-aware access control.

## Entry: 2026-02-05 (web-admin auth)
- Date: 2026-02-05
- Task: Implement web-admin admin session flow without static backend token dependency.
- Decision/Change:
  - Added web-admin auth API routes:
    - `POST /api/admin/auth/otp/request`
    - `POST /api/admin/auth/otp/verify`
    - `POST /api/admin/auth/refresh`
    - `POST /api/admin/auth/logout`
  - Added `/auth` page with OTP sign-in, session logout, and local `dev_code` support.
  - Stored tokens in `HttpOnly` cookies (`wa_access_token`, `wa_refresh_token`).
  - Updated catalog write proxy to read cookie token first, then fallback `WEB_ADMIN_ACCESS_TOKEN`.
  - Added backend settings:
    - `APP_ADMIN_PHONE_NUMBERS` for local admin role promotion on OTP sign-in,
    - `APP_DEBUG_RETURN_OTP_CODE` for local OTP development.
  - Added backend tests for admin phone parsing helper.
- Why:
  - Remove hard dependency on static admin token in web-admin runtime.
  - Keep local development flow practical before SMS provider integration.
- Files touched:
  - `backend/app/core/config.py`
  - `backend/app/modules/auth/api/router.py`
  - `backend/app/modules/auth/api/schemas.py`
  - `backend/app/modules/auth/domain/services.py`
  - `backend/app/modules/auth/infra/repository.py`
  - `backend/tests/test_auth_admin_phones.py`
  - `web-admin/app/auth/page.tsx`
  - `web-admin/app/api/admin/auth/*`
  - `web-admin/src/shared/server/backend-admin-proxy.ts`
  - `web-admin/src/features/auth/api.ts`
  - `README.md`
  - `.env.example`
- Next step:
  - Enforce explicit admin/moderator onboarding flow (not only phone allowlist) and add integration tests for auth-cookie proxy path.

## Entry: 2026-02-06 (local runtime)
- Date: 2026-02-06
- Task: Start full local runtime for manual verification (PostgreSQL + backend + web-admin).
- Decision/Change:
  - Installed `postgresql@16` via Homebrew and started service.
  - Applied backend migrations against local Postgres.
  - Started backend and web-admin in persistent PTY sessions.
  - Verified endpoints:
    - `GET /api/v1/health` -> 200
    - `GET /` (web-admin) -> 200
    - `GET /auth` (web-admin) -> 200
  - Verified OTP request through web-admin proxy returns `dev_code` in local mode.
- Why:
  - User requested immediate end-to-end run for visual/manual validation.
- Files touched:
  - `.context/operations/work_log.md`
- Next step:
  - Keep sessions running during manual UI checks; stop sessions when validation is complete.

## Entry: 2026-02-06 (web-admin i18n + UI refactor)
- Date: 2026-02-06
- Task: Refactor web-admin UI to Russian-first interface with RU/EN switch.
- Decision/Change:
  - Added centralized i18n layer (`ru`, `en`) with typed messages and language resolver.
  - Added reusable language switch component and integrated it on `/`, `/auth`, `/catalog`.
  - Refactored `/auth` into App Router-safe split:
    - server page for language resolution + switch,
    - client auth form component for interactive OTP flow.
  - Localized catalog page and write panel texts, statuses, and date locale formatting.
  - Added global UI tokens (`globals.css`) and updated home page to consistent card layout.
  - Added `.prettierignore` to exclude `.next` artifacts from formatting checks.
  - Updated Next.js route handler typing for dynamic segment params (`Promise<{ courseId: string }>`).
- Why:
  - Meet requirement: default Russian UI with explicit English switching.
  - Keep implementation aligned with Next.js App Router constraints and build pipeline.
- Files touched:
  - `web-admin/src/shared/i18n/lang.ts`
  - `web-admin/src/shared/i18n/messages.ts`
  - `web-admin/src/shared/ui/language-switch.tsx`
  - `web-admin/src/shared/ui/language-switch.module.css`
  - `web-admin/app/page.tsx`
  - `web-admin/app/home.module.css`
  - `web-admin/app/auth/page.tsx`
  - `web-admin/src/features/auth/components/auth-form.tsx`
  - `web-admin/app/catalog/page.tsx`
  - `web-admin/src/features/catalog/components/catalog-write-panel.tsx`
  - `web-admin/app/layout.tsx`
  - `web-admin/app/globals.css`
  - `web-admin/.prettierignore`
- Next step:
  - Add backend-driven localization for API error messages if fully localized failure copy is required.

## Entry: 2026-02-06 (mobile scaffold kickoff)
- Date: 2026-02-06
- Task: Start Android-first mobile development with modular architecture and first auth screen slice.
- Decision/Change:
  - Created standalone `mobile/` Gradle project with version catalog and module graph:
    - `:app`
    - `:core:model`, `:core:common`, `:core:designsystem`, `:core:ui`
    - `:feature:auth:api`, `:feature:auth:impl`
  - Implemented initial app navigation host with `auth -> home` flow.
  - Added first feature vertical slice:
    - `AuthRoute`, `AuthScreen`, `AuthViewModel`, `AuthUiState`, auth navigation extension.
  - Applied Material 3 theme wrapper (`DigitalEduTheme`) with dynamic colors enabled on Android 12+.
- Why:
  - Unlock parallel mobile feature work using strict module boundaries from project architecture.
  - Provide a runnable UI baseline before integrating backend APIs and offline-first data layer.
- Files touched:
  - `mobile/settings.gradle.kts`
  - `mobile/gradle/libs.versions.toml`
  - `mobile/app/*`
  - `mobile/core/*`
  - `mobile/feature/auth/api/*`
  - `mobile/feature/auth/impl/*`
  - `.context/planning/current_focus.md`
  - `.context/planning/roadmap.md`
- Next step:
  - Add `core:network` and connect auth flow to backend OTP request/verify endpoints.

## Entry: 2026-02-06 (mobile auth API integration)
- Date: 2026-02-06
- Task: Continue mobile development by wiring auth flow to real backend OTP endpoints.
- Decision/Change:
  - Added new modules:
    - `:core:network` (Retrofit + Kotlin serialization auth datasource),
    - `:core:data` (auth repository + in-memory session cache).
  - Implemented backend contract support:
    - `POST /api/v1/auth/otp/request`,
    - `POST /api/v1/auth/otp/verify`.
  - Refactored auth feature UI/state:
    - two-step flow (`request code` -> `verify code`),
    - optional `dev_code` rendering for local backend debug mode,
    - ViewModel factory with explicit `AuthRepository` dependency from `app`.
  - Added mobile runtime networking config:
    - `BuildConfig.BACKEND_BASE_URL` (`http://10.0.2.2:8000` in debug),
    - `INTERNET` permission and cleartext traffic enabled for local HTTP backend.
- Why:
  - Move from static demo screen to an actual backend-integrated mobile auth slice.
  - Keep modular boundaries intact (`app` composes dependencies, feature consumes abstraction).
- Files touched:
  - `mobile/settings.gradle.kts`
  - `mobile/gradle/libs.versions.toml`
  - `mobile/app/build.gradle.kts`
  - `mobile/app/src/main/AndroidManifest.xml`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/DigitalEduApp.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/navigation/AppNavHost.kt`
  - `mobile/core/network/*`
  - `mobile/core/data/*`
  - `mobile/core/model/*`
  - `mobile/feature/auth/impl/*`
  - `mobile/README.md`
  - `.context/planning/current_focus.md`
- Next step:
  - Replace in-memory auth token cache with secure persistent storage and add auth session restore on app start.

## Entry: 2026-02-06 (mobile secure session storage)
- Date: 2026-02-06
- Task: Continue mobile development by replacing in-memory auth cache with secure persistent token storage.
- Decision/Change:
  - Added `SecureAuthSessionStore` in `app` module:
    - Android Keystore secret key (`AES/GCM/NoPadding`),
    - encrypted token payload in `SharedPreferences`,
    - defensive fallback (clear corrupted payload).
  - Extended auth repository contract with `clearSession()`.
  - Made `AuthSessionStore` injectable so `app` composes Android-specific secure storage while `core:data` remains platform-agnostic.
  - Enabled startup session restore:
    - app checks stored tokens at launch,
    - nav starts from `home` if session exists, otherwise from `auth`.
  - Added manual logout action on home screen to validate session clearing flow.
- Why:
  - In-memory session cache lost auth state on process restart and did not meet security baseline.
  - Keystore-based encryption improves local token protection without breaking module boundaries.
- Files touched:
  - `mobile/core/data/src/main/kotlin/com/digitaledu/core/data/auth/AuthRepository.kt`
  - `mobile/core/data/src/main/kotlin/com/digitaledu/core/data/auth/NetworkAuthRepository.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/auth/SecureAuthSessionStore.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/DigitalEduApp.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/navigation/AppNavHost.kt`
  - `mobile/README.md`
  - `.context/planning/current_focus.md`
- Next step:
  - Add mobile refresh/logout endpoint integration and automatic token refresh strategy.

## Entry: 2026-02-06 (mobile auth lifecycle refresh/logout)
- Date: 2026-02-06
- Task: Continue mobile auth work by implementing backend-aware session lifecycle.
- Decision/Change:
  - Extended network datasource with:
    - `POST /api/v1/auth/refresh`
    - `POST /api/v1/auth/logout`
  - Extended `AuthRepository` contract with lifecycle operations:
    - `refreshSession()`
    - `restoreSession()`
    - `logout()`

## Entry: 2026-02-06 (local run restart)
- Date: 2026-02-06
- Task: Re-run local web and backend after failed connection from browser.
- Decision/Change:
  - Confirmed both ports were free and previous sessions were terminated.
  - Started services as active PTY sessions (not `nohup`) for stable local preview:
    - `web-admin`: `npm run dev -- --hostname 127.0.0.1 --port 3000`
    - `backend`: `python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000`
  - Verified runtime availability with HTTP checks:
    - `GET http://127.0.0.1:3000` -> `200`
    - `GET http://127.0.0.1:8000/api/v1/health` -> `200`
- Why:
  - Browser connection failed because earlier dev sessions had already exited.
  - PTY sessions keep server lifecycle explicit and easier to monitor.
- Files touched:
  - `.context/operations/work_log.md`
- Next step:
  - Run manual UI flow in web-admin and validate OTP/auth + catalog flows end-to-end.

## Entry: 2026-02-06 (next16 searchParams compatibility)
- Date: 2026-02-06
- Task: Remove Next.js 16 runtime warnings for App Router `searchParams`.
- Decision/Change:
  - Updated page signatures to async `searchParams: Promise<...>` and unwrapped via `await`:
    - `web-admin/app/page.tsx`
    - `web-admin/app/auth/page.tsx`
    - `web-admin/app/catalog/page.tsx`
  - Re-ran `npm run type-check` in `web-admin` and verified `200` responses for `/`, `/auth`, `/catalog`.
- Why:
  - Next.js 16 treats `searchParams` as async dynamic API and logs warnings for sync access.
- Files touched:
  - `web-admin/app/page.tsx`
  - `web-admin/app/auth/page.tsx`
  - `web-admin/app/catalog/page.tsx`
  - `.context/operations/work_log.md`
- Next step:
  - Keep this pattern for all future App Router pages using `searchParams`.

## Entry: 2026-02-06 (e2e auth+catalog flow verification)
- Date: 2026-02-06
- Task: Validate full local E2E flow (OTP auth -> catalog write -> release delivery).
- Decision/Change:
  - Re-started local services and verified availability:
    - `GET http://127.0.0.1:3000/?lang=ru` -> `200`
    - `GET http://127.0.0.1:8000/api/v1/health` -> `200`
  - Executed OTP auth via web-admin API routes:
    - `POST /api/admin/auth/otp/request` -> `200` (received `dev_code` in local mode)
    - `POST /api/admin/auth/otp/verify` -> `200` (session cookies set)
  - Verified catalog write actions with authenticated admin session:
    - `POST /api/admin/catalog/courses` -> `201` (created active course `e2e-course-1770338178`)
    - `POST /api/admin/catalog/courses/{courseId}/releases` -> `201` (created published release `1.0.0`, `screen_count=1`)
  - Validated delivery/read paths:
    - `GET /api/v1/catalog/courses/{slug}/releases/latest` -> `200` (bundle includes release + screens)
    - `GET /catalog?lang=ru&courseId={courseId}` -> `200` and page HTML contains course title + release version.
- Why:
  - User reported connection issues and requested hands-on continuation with full product flow verification.
  - Confirms both API and web-admin integration paths are operational on local environment.
- Files touched:
  - `.context/operations/work_log.md`
- Next step:
  - Add repeatable smoke script (`scripts/e2e_local_smoke.sh`) and mask sensitive token fields in debug outputs.

## Entry: 2026-02-06 (catalog UX copy clarity)
- Date: 2026-02-06
- Task: Improve catalog wording to be user-friendly and remove ambiguity around "release".
- Decision/Change:
  - Reworded RU/EN i18n copy from "release/релиз" to "course version/версия курса" in user-facing labels and messages.
  - Added explicit concept hint in catalog header explaining that a version is a package of screens/content downloaded by the app.
  - Updated create-flow labels/errors in write panel to match new terminology.
- Why:
  - Product owner reported confusion about "release"; wording needed to be understandable for non-technical users.
- Files touched:
  - `web-admin/src/shared/i18n/messages.ts`
  - `web-admin/app/catalog/page.tsx`
  - `web-admin/app/catalog/catalog.module.css`
  - `.context/operations/work_log.md`
- Next step:
  - Validate wording with target users and refine role-based language (admin vs curator) if needed.

## Entry: 2026-02-06 (home dashboard navigation)
- Date: 2026-02-06
- Task: Build a single user-friendly start screen to navigate key functionality.
- Decision/Change:
  - Reworked `/` into a dashboard-style "workspace" page with:
    - quick-start action buttons (`sign-in`, `catalog`),
    - ordered workflow cards (`Step 1`, `Step 2`),
    - explanatory card clarifying the concept of a course version.
  - Extended RU/EN i18n model for home page dashboard copy.
  - Updated home page styles for clearer visual hierarchy and mobile-friendly actions.
  - Verified `prettier`, `type-check`, and `next build` pass.
- Why:
  - Product owner asked for a single entry screen from which users can continue by functionality.
  - Existing home page was too sparse and did not explain workflow or terminology well enough.
- Files touched:
  - `web-admin/app/page.tsx`
  - `web-admin/app/home.module.css`
  - `web-admin/src/shared/i18n/messages.ts`
  - `.context/operations/work_log.md`
- Next step:
  - Add role-specific dashboard variants (admin/curator) once role-based UI routing is finalized.

## Entry: 2026-02-06 (course version screen builder)
- Date: 2026-02-06
- Task: Continue functional development by making version creation more user-friendly.
- Decision/Change:
  - Reworked version screen input in catalog write panel:
    - default mode is a visual screen builder,
    - optional advanced JSON mode remains available for power users.
  - Added builder UX:
    - add/remove screen cards,
    - ordered cards mapped to `order_index`,
    - fields for key/title/type/headline/body/asset key.
  - Added strict client-side validation before submit:
    - screen key format (`^[a-z0-9][a-z0-9_.-]{2,119}$`),
    - required screen title,
    - required `asset_key` for image-type screens.
  - Extended RU/EN i18n copy for builder labels, hints, and validation errors.
  - Verified `prettier`, `type-check`, and `next build` pass.
- Why:
  - Product owner asked to continue by functionality and keep UX maximally understandable.
  - Manual JSON-only editing was too technical for typical admin/curator workflow.
- Files touched:
  - `web-admin/src/features/catalog/components/catalog-write-panel.tsx`
  - `web-admin/src/features/catalog/components/catalog-write-panel.module.css`
  - `web-admin/src/shared/i18n/messages.ts`
  - `.context/operations/work_log.md`
- Next step:
  - Add UI preview for the assembled screen payload before publishing a version.
  - Implemented startup session restore strategy:
    - read cached secure tokens,
    - call backend `refresh`,
    - route to `home` only on successful refresh.
  - Updated home logout action to call backend logout then clear local session store.
- Why:
  - Valid cached tokens should not be trusted blindly at startup without server-side refresh.
  - Logout should revoke backend refresh session, not only clear local state.
- Files touched:
  - `mobile/core/network/src/main/kotlin/com/digitaledu/core/network/AuthNetworkDataSource.kt`
  - `mobile/core/network/src/main/kotlin/com/digitaledu/core/network/retrofit/RetrofitAuthNetworkDataSource.kt`
  - `mobile/core/data/src/main/kotlin/com/digitaledu/core/data/auth/AuthRepository.kt`
  - `mobile/core/data/src/main/kotlin/com/digitaledu/core/data/auth/NetworkAuthRepository.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/DigitalEduApp.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/navigation/AppNavHost.kt`
  - `mobile/app/build.gradle.kts`
  - `mobile/README.md`
  - `.context/planning/current_focus.md`
- Next step:
  - Add automatic access-token refresh strategy for future protected mobile API calls.

## Entry: 2026-02-06 (mobile build pipeline validation)
- Date: 2026-02-06
- Task: Make mobile module buildable/testable from CLI and validate current implementation.
- Decision/Change:
  - Generated Gradle Wrapper in `mobile/` (`gradlew`, `gradle/wrapper/*`).
  - Installed and used `openjdk@17` for Gradle toolchain compatibility.
  - Fixed Android manifest theme to valid platform style:
    - `@android:style/Theme.Material.Light.NoActionBar`.
  - Fixed module classpath errors:
    - added missing dependencies in `app` (`core:model`, `feature:auth:api`),
    - added missing dependency in `feature:auth:impl` (`core:model`).
  - Added `@OptIn(ExperimentalMaterial3Api::class)` for `CenterAlignedTopAppBar` usage.
  - Re-ran verification:
    - `:app:assembleDebug` -> success
    - `:core:data:test` -> NO-SOURCE (no tests yet)
    - `:core:network:test` -> NO-SOURCE (no tests yet)
- Why:
  - Without wrapper + JDK 17, mobile module could not be validated in CLI.
  - Build failures surfaced real dependency/theme issues that are now fixed.
- Files touched:
  - `mobile/gradlew`
  - `mobile/gradlew.bat`
  - `mobile/gradle/wrapper/gradle-wrapper.jar`
  - `mobile/gradle/wrapper/gradle-wrapper.properties`
  - `mobile/app/src/main/AndroidManifest.xml`
  - `mobile/app/build.gradle.kts`
  - `mobile/feature/auth/impl/build.gradle.kts`
  - `mobile/feature/auth/impl/src/main/kotlin/com/digitaledu/feature/auth/impl/AuthScreen.kt`
  - `.context/planning/current_focus.md`
  - `.context/operations/work_log.md`
- Next step:
  - Add first unit tests for auth repository/session lifecycle in `core:data` and `core:network`.

## Entry: 2026-02-06 (mobile toolchain sync fix)
- Date: 2026-02-06
- Task: Fix Android Studio/Gradle sync failure for missing Java 17 toolchain.
- Decision/Change:
  - Added explicit Gradle JDK discovery path in `mobile/gradle.properties`:
    - `org.gradle.java.installations.paths=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`.
  - Verified `./gradlew -q javaToolchains` now reports JDK 17 via Gradle property.
  - Verified failing task now resolves compiler toolchain successfully:
    - `./gradlew :core:data:compileJava --no-daemon` -> `BUILD SUCCESSFUL`.
- Why:
  - macOS/IDE detected only JDK 24, while project requires Java 17 toolchain.
  - Explicit path removes dependency on manual `JAVA_HOME` setup for this workspace.
- Files touched:
  - `mobile/gradle.properties`
  - `.context/operations/work_log.md`
- Next step:
  - Reload Gradle project in Android Studio and continue feature work in `mobile`.

## Entry: 2026-02-06 (local runtime restart for manual check)
- Date: 2026-02-06
- Task: Start local services on request for manual product walkthrough.
- Decision/Change:
  - Started `web-admin` dev server on `127.0.0.1:3000`.
  - Started `backend` API server on `127.0.0.1:8000`.
  - Verified availability:
    - `GET /?lang=ru` -> `200`
    - `GET /api/v1/health` -> `200`
- Why:
  - User requested to run the system and continue feature validation in browser.
- Files touched:
  - `.context/operations/work_log.md`
- Next step:
  - Continue manual functional checks from dashboard -> auth -> catalog workflow.

## Entry: 2026-02-06 (mobile access-token auto refresh)
- Date: 2026-02-06
- Task: Implement auto-refresh strategy for protected mobile API calls.
- Decision/Change:
  - Extended `AuthRepository` with `withFreshAccessToken { accessToken -> ... }` helper for protected requests.
  - Added retry-on-401 logic in `NetworkAuthRepository`:
    - first call with cached access token,
    - on `401` run `refreshSession()`,
    - retry once with refreshed access token,
    - if refresh fails, clear session and return `"Сессия истекла, войдите снова"`.
  - Added `statusCode` support to `NetworkException` and mapped HTTP code in Retrofit datasource.
  - Added unit tests for happy path and failure paths in `core:data`.
  - Updated mobile README with usage note and adjusted next planned step.
  - Validation:
    - `./gradlew :core:data:test :app:assembleDebug --no-daemon` -> `BUILD SUCCESSFUL`.
- Why:
  - Repositories for protected APIs need a single consistent token refresh policy to avoid duplicated auth handling in each feature.
- Files touched:
  - `mobile/core/data/src/main/kotlin/com/digitaledu/core/data/auth/AuthRepository.kt`
  - `mobile/core/data/src/main/kotlin/com/digitaledu/core/data/auth/NetworkAuthRepository.kt`
  - `mobile/core/network/src/main/kotlin/com/digitaledu/core/network/NetworkException.kt`
  - `mobile/core/network/src/main/kotlin/com/digitaledu/core/network/retrofit/RetrofitAuthNetworkDataSource.kt`
  - `mobile/core/data/src/test/kotlin/com/digitaledu/core/data/auth/NetworkAuthRepositoryTest.kt`
  - `mobile/core/data/build.gradle.kts`
  - `mobile/README.md`
  - `.context/operations/work_log.md`
- Next step:
  - Add first protected mobile datasource (e.g. lessons/catalog sync) that calls backend with bearer token via `withFreshAccessToken`.

## Entry: 2026-02-06 (mobile key learning flow)
- Date: 2026-02-06
- Task: Implement key mobile functionality end-to-end after auth.
- Decision/Change:
  - Added catalog domain models in `core:model` (`CatalogCourse`, `CatalogRelease`, `CatalogScreen`, `CatalogBundle`).
  - Implemented catalog network layer in `core:network`:
    - `GET /api/v1/catalog/courses`
    - `GET /api/v1/catalog/courses/{slug}/releases/latest`
  - Implemented catalog repository in `core:data` (`createCatalogRepository`, `listCourses`, `getLatestCourseBundle`).
  - Integrated repository into app bootstrap (`DigitalEduApp`) and passed into navigation host.
  - Replaced placeholder home screen with key user flow:
    - load courses,
    - open latest published release,
    - step-by-step playback with `Назад/Дальше` and return to course list,
    - preserved logout action.
  - Added lifecycle ViewModel dependencies to app module and created `HomeViewModel` with loading/error/content states.
  - Updated mobile README with new MVP flow and next steps.
  - Validation:
    - `./gradlew :core:data:test :app:assembleDebug --no-daemon` -> `BUILD SUCCESSFUL`.
- Why:
  - User requested to prioritize core product functionality before UI/details polish.
  - This creates a working post-auth learning path that can now be enriched with typed rendering and progress sync.
- Files touched:
  - `mobile/core/model/src/main/kotlin/com/digitaledu/core/model/CatalogBundle.kt`
  - `mobile/core/network/src/main/kotlin/com/digitaledu/core/network/CatalogNetworkDataSource.kt`
  - `mobile/core/network/src/main/kotlin/com/digitaledu/core/network/retrofit/RetrofitCatalogNetworkDataSource.kt`
  - `mobile/core/data/src/main/kotlin/com/digitaledu/core/data/catalog/CatalogRepository.kt`
  - `mobile/core/data/src/main/kotlin/com/digitaledu/core/data/catalog/NetworkCatalogRepository.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/DigitalEduApp.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/navigation/AppNavHost.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/navigation/HomeViewModel.kt`
  - `mobile/app/build.gradle.kts`
  - `mobile/README.md`
  - `.context/planning/current_focus.md`
  - `.context/operations/work_log.md`
- Next step:
  - Implement typed rendering per screen payload (`video`, `simulation`, `summary`) and persist lesson progress locally.

## Entry: 2026-02-06 (radical frontend redesign)
- Date: 2026-02-06
- Task: Perform a radical UI redesign for web-admin while preserving functional flows.
- Decision/Change:
  - Applied a new visual direction across `home`, `auth`, `catalog`, and shared controls:
    - strong editorial typography hierarchy,
    - bold warm+electric palette,
    - high-contrast panel system with non-generic layout treatment,
    - redesigned language switch and form controls.
  - Reworked auth page composition into split shell (`intro + form workspace`) for clearer flow.
  - Refined catalog workspace styling (course rail + operations + version feed) without changing API behavior.
  - Updated root design-system tokens in `globals.css` and font setup in `layout.tsx`.
  - Maintained functional behavior (OTP/auth/catalog/create version).
  - Verified quality gates:
    - `prettier --check` ✅
    - `tsc --noEmit` ✅
    - `next build` ✅
- Why:
  - User requested a non-generic, radically different and more intentional visual identity.
- Files touched:
  - `web-admin/app/layout.tsx`
  - `web-admin/app/globals.css`
  - `web-admin/app/home.module.css`
  - `web-admin/app/auth/page.tsx`
  - `web-admin/app/auth/auth.module.css`
  - `web-admin/app/catalog/page.tsx`
  - `web-admin/app/catalog/catalog.module.css`
  - `web-admin/src/shared/ui/language-switch.module.css`
  - `web-admin/src/features/catalog/components/catalog-write-panel.module.css`
  - `.context/operations/work_log.md`
- Next step:
  - Gather visual feedback and iterate role-specific variants for admin/curator dashboards.

## Entry: 2026-02-06 (ux-pattern diversification)
- Date: 2026-02-06
- Task: Remove repetitive UI patterns across key web-admin screens.
- Decision/Change:
  - Reworked each key page with a distinct UX structure:
    - Home: bento-style functional mosaic,
    - Auth: focused dark flow screen,
    - Catalog: data-workspace layout with practical rail + content area.
  - Avoided repeating identical card language, spacing rhythm, and surface treatment between pages.
  - Preserved all existing functional flows and routes.
  - Validation passed:
    - `prettier --check` ✅
    - `tsc --noEmit` ✅
    - `next build` ✅
- Why:
  - User feedback: current UI felt repetitive and insufficiently differentiated by task context.
- Files touched:
  - `web-admin/app/page.tsx`
  - `web-admin/app/home.module.css`
  - `web-admin/app/auth/page.tsx`
  - `web-admin/app/auth/auth.module.css`
  - `web-admin/app/catalog/catalog.module.css`
  - `.context/operations/work_log.md`
- Next step:
  - Tune density/contrast of each screen with user feedback after live review.

## Entry: 2026-02-06 (ux simplification per direct feedback)
- Date: 2026-02-06
- Task: Remove over-explaining and repetitive guidance blocks from UX flow.
- Decision/Change:
  - Home: removed onboarding-like hints/steps and kept only direct module actions.
  - Auth: removed decorative flow chips and duplicated heading hierarchy.
  - Catalog: removed repeated explanatory block about course version concept.
  - Updated RU/EN labels from step-oriented wording to neutral functional wording.
  - Verified with build checks and live routes:
    - `prettier --check` ✅
    - `tsc --noEmit` ✅
    - `next build` ✅
    - `GET /?lang=ru` and `GET /catalog?lang=ru` -> `200`
- Why:
  - User requested cleaner, less patronizing flow without duplicated helper copy.
- Files touched:
  - `web-admin/app/page.tsx`
  - `web-admin/app/home.module.css`
  - `web-admin/app/auth/page.tsx`
  - `web-admin/app/auth/auth.module.css`
  - `web-admin/app/catalog/page.tsx`
  - `web-admin/app/catalog/catalog.module.css`
  - `web-admin/src/shared/i18n/messages.ts`
  - `.context/operations/work_log.md`
- Next step:
  - Fine-tune visual density/contrast on a per-screen basis after user review.

## Entry: 2026-02-06 (mobile UI redesign for auth + learning flow)
- Date: 2026-02-06
- Task: Upgrade visual quality of mobile screens while keeping key functionality intact.
- Decision/Change:
  - Redesigned auth screen with richer Material 3 layout:
    - gradient background,
    - elevated hero + form cards,
    - clearer hierarchy for phone/OTP flow,
    - styled error/dev-code blocks.
  - Redesigned home flow UI for core scenario:
    - top app bar with logout action,
    - hero section,
    - modern course cards,
    - lesson playback card with progress indicator and outline section.
  - Preserved business flow:
    - auth -> courses -> latest bundle -> step-by-step playback.
  - Validation:
    - `./gradlew :feature:auth:impl:compileDebugKotlin :app:assembleDebug --no-daemon` -> `BUILD SUCCESSFUL`
    - `./gradlew :core:data:test --no-daemon` -> `BUILD SUCCESSFUL`
- Why:
  - User requested to prioritize a proper, production-like visual design before deep detail work.
- Files touched:
  - `mobile/feature/auth/impl/src/main/kotlin/com/digitaledu/feature/auth/impl/AuthScreen.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/navigation/AppNavHost.kt`
  - `.context/operations/work_log.md`
- Next step:
  - Replace generic payload preview with typed screen renderers (`video`, `simulation`, `summary`).

## Entry: 2026-02-08 (web-admin UX overhaul)
- Date: 2026-02-08
- Task: Redesign web-admin UX to remove repetitive flow steps and align visuals with Stepik-like catalog patterns.
- Decision/Change:
  - Refactored auth flow UX:
    - OTP code field is now shown only after OTP request returns `challenge_id`.
    - Removed auth screen secondary actions (`logout`, direct catalog link) before sign-in.
    - Successful OTP verification now redirects to workspace dashboard (`/?lang=...`) instead of opening catalog directly.
  - Refactored dashboard flow:
    - Home page now checks admin session cookie (`wa_access_token`).
    - Without session: only sign-in entry point is shown.
    - With session: dashboard shows functional card(s), currently catalog.
  - Refactored catalog UX:
    - Removed "Admin sign-in" link from catalog header.
    - Added top navigation back to workspace, overview cards, and cleaner card-based layout.
    - Updated visual system (typography, cards, controls, language switch) to a cleaner course-catalog style.
  - Simplified repeated copy in RU/EN UI messages to reduce duplicated "course version" hints.
- Why:
  - User reported confusing and repetitive UX flow.
  - Product requirement: clear sequence `auth -> dashboard -> function`.
  - Better usability and readability for day-to-day admin operations.
- Files touched:
  - `web-admin/app/page.tsx`
  - `web-admin/app/home.module.css`
  - `web-admin/app/auth/page.tsx`
  - `web-admin/app/auth/auth.module.css`
  - `web-admin/src/features/auth/components/auth-form.tsx`
  - `web-admin/app/catalog/page.tsx`
  - `web-admin/app/catalog/catalog.module.css`
  - `web-admin/src/features/catalog/components/catalog-write-panel.module.css`
  - `web-admin/src/shared/ui/language-switch.module.css`
  - `web-admin/app/globals.css`
  - `web-admin/app/layout.tsx`
  - `web-admin/src/shared/i18n/messages.ts`
  - `.context/operations/work_log.md`
- Next step:
  - Validate UX manually in browser with real auth flow and then iterate on micro-copy/actions based on your feedback.

## Entry: 2026-02-08 (unified run command)
- Date: 2026-02-08
- Task: Add one-command local startup for backend + web-admin.
- Decision/Change:
  - Added root executable `run` script that starts:
    - PostgreSQL via Docker Compose,
    - backend migrations (`alembic upgrade head`),
    - backend dev server (`uvicorn --reload`),
    - web-admin dev server (`next dev`).
  - Added `run` target to `Makefile` (`make run` -> `./run`).
  - Updated root `README.md` quick start to use unified startup command.
- Why:
  - User requested stable terminal-first launch without manual multi-command setup.
- Files touched:
  - `run`
  - `Makefile`
  - `README.md`
  - `.context/operations/work_log.md`
- Next step:
  - If needed, add optional `run-mobile` helper for Android emulator workflow.

## Entry: 2026-02-08 (useflow interview continuation)
- Date: 2026-02-08
- Task: Continue structured interview for web-admin useflow and MVP priorities.
- Decision/Change:
  - Confirmed role model details for admin/methodologist/moderator/curator.
  - Confirmed content model `course -> modules -> lessons -> screens`.
  - Confirmed dashboard-first flow after auth.
  - Confirmed progress metric baseline: completed lessons.
  - Confirmed MVP priority shift to authoring-first (full course creation tooling before advanced analytics).
- Why:
  - User wants end-to-end usable authoring flow as primary MVP value.
- Files touched:
  - `.context/planning/interview.md`
  - `.context/planning/current_focus.md`
  - `.context/operations/work_log.md`
- Next step:
  - Finish interview rounds for metrics and release-app compatibility, then produce final useflow document.

## Entry: 2026-02-08 (useflow interview round 4)
- Date: 2026-02-08
- Task: Capture authoring-first useflow decisions and permission model constraints.
- Decision/Change:
  - Confirmed extended screen types in MVP (`video`, `simulation`, `quiz`, `summary`).
  - Confirmed drag-and-drop reordering requirement for content hierarchy.
  - Confirmed app compatibility strategy via `app_version_range`.
  - Confirmed soft-delete policy for MVP.
  - Confirmed published release editing remains allowed, with requirement to implement action-level permission controls.
- Why:
  - Align MVP around full course creation tooling and reduce friction in content operations.
- Files touched:
  - `.context/planning/interview.md`
  - `.context/operations/work_log.md`
- Next step:
  - Finalize module schema and produce consolidated web-admin useflow document.

## Entry: 2026-02-08 (course builder concept)
- Date: 2026-02-08
- Task: Define authoring-first product concept for digital literacy simulation platform.
- Decision/Change:
  - Added dedicated product spec for no-code course/simulation builder.
  - Fixed target model: `Course -> Module -> Lesson -> Screen` with hotspot graph editing.
  - Captured MVP tooling recommendations and validation gates for publish.
- Why:
  - User clarified core goal: quickly teach older adults via simulation with hints and clickable zones.
- Files touched:
  - `.context/product/course_builder_platform.md`
  - `.context/operations/work_log.md`
- Next step:
  - Convert this concept into detailed UI useflow screens and API contracts.

## Entry: 2026-02-08 (full web-admin useflow)
- Date: 2026-02-08
- Task: Produce complete web-admin MVP useflow for authoring-first platform.
- Decision/Change:
  - Added full useflow document covering:
    - role-specific entry and navigation,
    - full authoring lifecycle,
    - no-code simulation builder UX,
    - moderation and publish states,
    - group assignment and progress tracking,
    - global search,
    - soft-delete behavior,
    - action-level RBAC matrix.
  - Updated `.context` index to include new product/useflow artifacts.
- Why:
  - User requested full, best-practice useflow baseline before implementation.
- Files touched:
  - `.context/product/web_admin_useflow.md`
  - `.context/README.md`
  - `.context/operations/work_log.md`
- Next step:
  - Convert useflow into implementation backlog: screens, APIs, DB changes, and per-sprint tasks.

## Entry: 2026-02-08 (flexible RBAC decision)
- Date: 2026-02-08
- Task: Finalize permission model direction for web-admin MVP.
- Decision/Change:
  - Confirmed: no hardcoded role-action matrix in code.
  - Adopted flexible DB-driven RBAC policy with action-level permissions.
  - Updated web-admin useflow doc to replace static matrix with policy model and implementation steps.
- Why:
  - Product needs long-term flexibility for changing responsibilities and organizational setups.
- Files touched:
  - `.context/product/web_admin_useflow.md`
  - `.context/planning/interview.md`
  - `.context/operations/work_log.md`
- Next step:
  - Run interview for policy editor scope, permission scopes, and override rules.

## Entry: 2026-02-08 (RBAC interview constraints finalized)
- Date: 2026-02-08
- Task: Finalize MVP constraints for flexible RBAC policy model.
- Decision/Change:
  - Confirmed single-role-per-user model in MVP.
  - Confirmed no user-level permission overrides in MVP.
  - Confirmed scopes: `global`, `group`, `own`.
  - Confirmed conflict resolution: `deny` overrides `allow`.
  - Confirmed only `admin` can edit policies.
  - Confirmed policy changes must be audit-logged in DB.
  - Confirmed denied actions are hidden in UI.
  - Confirmed policy versioning is out of MVP.
- Why:
  - Keep RBAC flexible but operationally simple for initial delivery.
- Files touched:
  - `.context/product/web_admin_useflow.md`
  - `.context/planning/interview.md`
  - `.context/operations/work_log.md`
- Next step:
  - Continue interview to finalize module fields and quiz schema for authoring MVP.

## Entry: 2026-02-08 (module schema confirmed)
- Date: 2026-02-08
- Task: Finalize content module schema in useflow interview.
- Decision/Change:
  - Confirmed module required fields: `title`, `order_index`.
  - Confirmed optional fields: `description`, `status`.
  - Updated useflow and interview logs accordingly.
- Why:
  - Needed to close one of the final open decisions for authoring MVP.
- Files touched:
  - `.context/product/web_admin_useflow.md`
  - `.context/planning/interview.md`
  - `.context/operations/work_log.md`
- Next step:
  - finalize quiz schema and lesson linkage rules.

## Entry: 2026-02-08 (lesson/quiz schema finalized)
- Date: 2026-02-08
- Task: Finalize lesson linkage and quiz configuration via interview.
- Decision/Change:
  - Confirmed course isolation rule for MVP (no cross-course reuse).
  - Confirmed lesson belongs to exactly one module.
  - Confirmed quiz schema:
    - required: `time_limit`,
    - optional: `passing_score`, `attempt_limit`, `shuffle_questions`.
  - Updated web-admin useflow and interview logs.
- Why:
  - Needed to close authoring data model decisions before implementation backlog split.
- Files touched:
  - `.context/product/web_admin_useflow.md`
  - `.context/planning/interview.md`
  - `.context/operations/work_log.md`
- Next step:
  - close final analytics-widget clarification and generate implementation backlog by sprint.

## Entry: 2026-02-08 (analytics scope locked)
- Date: 2026-02-08
- Task: Finalize analytics boundary in web-admin MVP interview.
- Decision/Change:
  - Confirmed analytics is fully moved to Phase 2.
  - Marked MVP useflow as closed with no remaining open questions for current scope.
- Why:
  - Keep MVP focused on full authoring toolchain and release operations.
- Files touched:
  - `.context/product/web_admin_useflow.md`
  - `.context/planning/interview.md`
  - `.context/operations/work_log.md`
- Next step:
  - Generate implementation backlog by sprint from finalized useflow.

## Entry: 2026-02-08 (web-admin MVP backlog finalized)
- Date: 2026-02-08
- Task: Complete full planning package from finalized web-admin useflow.
- Decision/Change:
  - Added full sprint-by-sprint backlog file for web-admin MVP (`authoring-first`).
  - Synced roadmap with locked decisions:
    - flexible DB-driven RBAC,
    - content hierarchy with module layer,
    - simulation builder + moderation workflow,
    - analytics moved to Phase 2.
  - Updated current focus to start from Sprint 1 execution plan.
  - Updated context index and documentation status to include new planning artifact.
- Why:
  - User requested complete end-to-end planning baseline before implementation.
- Files touched:
  - `.context/planning/web_admin_mvp_backlog.md`
  - `.context/planning/roadmap.md`
  - `.context/planning/current_focus.md`
  - `.context/README.md`
  - `.context/operations/documentation_status.md`
  - `.context/operations/work_log.md`
- Next step:
  - Start Sprint 1 implementation tasks directly from `web_admin_mvp_backlog.md`.

## Entry: 2026-02-08 (admin-web auth/me + permission dashboard)
- Date: 2026-02-08
- Task: Continue admin-web Sprint 1: permission-aware dashboard shell and cleaner auth-to-dashboard flow.
- Decision/Change:
  - Added backend endpoint `GET /api/v1/auth/me` with current user profile payload (`user_id`, `role`, `status`, `display_name`, `permissions`).
  - Added temporary role-based permission templates in backend auth domain to bootstrap permission-aware UI before DB-driven RBAC tables (Sprint 2).
  - Added web-admin proxy route `GET /api/admin/auth/me` and extended backend admin proxy with authenticated GET support.
  - Refactored `/` dashboard flow:
    - no session -> redirect to `/auth`,
    - valid session -> load profile and render function tiles by permissions,
    - removed repeated onboarding hints and release explanations from dashboard.
  - Simplified auth screen by removing `challenge_id` output from visible UX flow.
- Why:
  - Match confirmed user flow: auth first, then a clean function hub.
  - Reduce cognitive overload from repeated explanatory blocks.
  - Prepare frontend for flexible RBAC without hardcoded screen-level checks.
- Files touched:
  - `backend/app/modules/auth/api/router.py`
  - `backend/app/modules/auth/api/schemas.py`
  - `backend/app/modules/auth/domain/permissions.py`
  - `backend/app/shared/auth/deps.py`
  - `backend/tests/test_auth_permissions.py`
  - `web-admin/app/api/admin/auth/me/route.ts`
  - `web-admin/src/shared/server/backend-admin-proxy.ts`
  - `web-admin/src/features/auth/api.ts`
  - `web-admin/src/features/auth/server.ts`
  - `web-admin/app/page.tsx`
  - `web-admin/app/home.module.css`
  - `web-admin/src/features/auth/components/auth-form.tsx`
  - `web-admin/app/auth/auth.module.css`
- Next step:
  - Start Sprint 2 implementation for DB-driven RBAC policies and wire new policy source into dashboard tiles.

## Entry: 2026-02-08 (catalog UX refactor + sign-in copy)
- Date: 2026-02-08
- Task: Simplify sign-in wording and redesign web-admin catalog UX for clearer authoring flow.
- Decision/Change:
  - Replaced RU/EN auth wording from role-heavy labels to neutral `Войти` / `Sign in` in UI messages.
  - Refactored `/catalog` layout to a cleaner three-zone workspace:
    - left sidebar: course navigation,
    - center: release overview, filters, and release cards,
    - right: content builder panel (`CatalogWritePanel`).
  - Reduced visual noise and duplicated hints; kept version explanation only in release context.
  - Preserved all existing course/release actions and filtering behavior.
- Why:
  - User requested less repetitive UX and a more intuitive flow inspired by modern course catalogs.
- Files touched:
  - `web-admin/src/shared/i18n/messages.ts`
  - `web-admin/app/catalog/page.tsx`
  - `web-admin/app/catalog/catalog.module.css`
  - `web-admin/app/page.tsx` (prettier only)
  - `web-admin/app/home.module.css` (prettier only)
- Next step:
  - Continue functional decomposition inside catalog: separate release list/read side and authoring/write side into dedicated modules.

## Entry: 2026-02-08 (switch auth to login/password)
- Date: 2026-02-08
- Task: Replace OTP-first admin auth with login/password flow for web-admin.
- Decision/Change:
  - Added backend credential endpoint `POST /api/v1/auth/login` with session token issuance.
  - Extended `users` domain with `login` + `password_hash` columns and migration `0003_add_login_password_auth`.
  - Added password hashing/verification utility (`pbkdf2_sha256` with per-user salt, constant-time compare).
  - Added local admin bootstrap via env credentials (`APP_ADMIN_LOGIN`, `APP_ADMIN_PASSWORD`) on first successful sign-in.
  - Added web-admin proxy route `POST /api/admin/auth/login` that sets secure session cookies.
  - Refactored web-admin auth form from OTP flow to login/password fields.
  - Updated docs/runbook examples to use login/password sign-in.
- Why:
  - User requested standard credential-based sign-in and removal of OTP dependence in admin flow.
- Files touched:
  - `backend/app/core/config.py`
  - `backend/app/modules/users/models.py`
  - `backend/app/modules/auth/api/schemas.py`
  - `backend/app/modules/auth/api/router.py`
  - `backend/app/modules/auth/domain/services.py`
  - `backend/app/modules/auth/infra/repository.py`
  - `backend/app/shared/security/passwords.py`
  - `backend/migrations/versions/0003_add_login_password_auth.py`
  - `backend/tests/test_passwords.py`
  - `web-admin/app/api/admin/auth/login/route.ts`
  - `web-admin/src/features/auth/api.ts`
  - `web-admin/src/features/auth/components/auth-form.tsx`
  - `web-admin/src/shared/i18n/messages.ts`
  - `.env.example`
  - `README.md`
  - `backend/README.md`
  - `.context/operations/runbook_local.md`
  - `.context/planning/current_focus.md`
  - `.context/operations/work_log.md`
- Next step:
  - Apply Alembic migration in the runtime DB and verify end-to-end sign-in with configured admin credentials.

## Entry: 2026-02-08 (admin credentials set + catalog decomposition)
- Date: 2026-02-08
- Task: Set local admin credentials in environment and continue admin-web development.
- Decision/Change:
  - Set local admin credentials in both runtime env files:
    - `.env`: `APP_ADMIN_LOGIN=admin`, `APP_ADMIN_PASSWORD=admin12345`
    - `backend/.env`: `APP_ADMIN_LOGIN=admin`, `APP_ADMIN_PASSWORD=admin12345`
  - Verified backend login endpoint with configured credentials (`POST /api/v1/auth/login` -> `200` + tokens).
  - Continued web-admin refactor by decomposing catalog page into dedicated components:
    - `CatalogSidebar` for course navigation,
    - `CatalogReleaseList` for release read-flow,
    - shared helpers `catalog-navigation.ts` and `catalog-presentation.ts`.
- Why:
  - User requested to set admin account directly and continue implementation.
  - Decomposition reduces page complexity and prepares for upcoming feature extensions.
- Files touched:
  - `.env`
  - `backend/.env`
  - `web-admin/app/catalog/page.tsx`
  - `web-admin/src/features/catalog/components/catalog-sidebar.tsx`
  - `web-admin/src/features/catalog/components/catalog-release-list.tsx`
  - `web-admin/src/features/catalog/catalog-navigation.ts`
  - `web-admin/src/features/catalog/catalog-presentation.ts`
  - `.context/planning/current_focus.md`
  - `.context/operations/work_log.md`
- Next step:
  - Continue splitting catalog into read/write subroutes or tabs (`/catalog/releases` and `/catalog/builder`) while keeping shared filters and language state.

## Entry: 2026-02-08 (web-admin UX flow simplification)
- Date: 2026-02-08
- Task: Continue admin-web work by simplifying UX flow and removing repeated hints on catalog screens.
- Decision/Change:
  - Refactored catalog navigation into two explicit workspace tabs:
    - `Версии курса / Course versions`
    - `Конструктор курса / Course builder`
  - Preserved selected course and filters in URL while switching tabs (`tab=versions|builder`).
  - Kept one concise explanation for versions and removed repeated explanatory text blocks.
  - Simplified dashboard visual hierarchy:
    - compact role/profile/permissions strip,
    - clearer tile actions,
    - cleaner RU-first copy.
  - Updated RU/EN wording to consistently use "version" terminology instead of mixed "release" wording.
  - Revalidated web-admin quality gates (`prettier`, `tsc`, `next build`).
- Why:
  - Product owner reported confusing flow and duplicated hints.
  - Goal is a faster, clearer path: sign-in -> dashboard -> catalog modes.
- Files touched:
  - `web-admin/app/catalog/page.tsx`
  - `web-admin/app/catalog/catalog.module.css`
  - `web-admin/src/features/catalog/catalog-navigation.ts`
  - `web-admin/src/features/catalog/components/catalog-sidebar.tsx`
  - `web-admin/app/page.tsx`
  - `web-admin/app/home.module.css`
  - `web-admin/src/shared/i18n/messages.ts`
  - `.context/operations/work_log.md`
- Next step:
  - Start implementing the first visual slice of the no-code simulation builder (canvas + hotspots) under the new `Course builder` workspace mode.

## Entry: 2026-02-08 (dashboard status strip hotfix)
- Date: 2026-02-08
- Task: Fix dashboard UX regression where `Role/Profile/Permissions` looked vertically stacked and cramped.
- Decision/Change:
  - Changed status strip layout from grid cards to compact horizontal chips.
  - Added explicit separators in copy (`Role:` / `Профиль:` / `Доступы:`) for readability even in fallback rendering.
  - Kept responsive wrapping for small screens.
  - Revalidated `tsc` and production `next build`.
- Why:
  - Product owner reported visual regression and unclear label/value grouping.
- Files touched:
  - `web-admin/app/page.tsx`
  - `web-admin/app/home.module.css`
  - `.context/operations/work_log.md`
- Next step:
  - Continue dashboard/panel UX cleanup with consistent information density rules.

## Entry: 2026-02-08 (simulation builder first functional slice)
- Date: 2026-02-08
- Task: Start implementation of web-admin simulation builder and connect it to catalog authoring flow.
- Decision/Change:
  - Added new web route `GET /simulation` with auth + permission gate (`simulation.builder`).
  - Created new feature module `web-admin/src/features/simulation` (`api/model/ui`).
  - Implemented interactive builder capabilities:
    - scenario draft in localStorage,
    - screen management,
    - click-to-create hotspots on preview canvas,
    - hotspot geometry/hint/transition editing,
    - transition summary list,
    - release-ready JSON export.
  - Added storage bridge for catalog authoring:
    - simulation builder saves prepared release `screens` JSON in localStorage,
    - catalog write panel can load it with one click (`Load from simulation builder`).
  - Updated dashboard tile `Конструктор симуляций` from `Soon` to real link (`/simulation`).
  - Verified quality gates: `prettier`, `tsc`, `next build` (green).
- Why:
  - Product direction requires no-code simulation construction as core MVP capability.
  - This slice delivers a usable authoring workflow before backend simulation module API is finalized.
- Files touched:
  - `web-admin/app/simulation/page.tsx`
  - `web-admin/app/simulation/simulation.module.css`
  - `web-admin/src/features/simulation/api/client.ts`
  - `web-admin/src/features/simulation/model/types.ts`
  - `web-admin/src/features/simulation/model/factories.ts`
  - `web-admin/src/features/simulation/model/export.ts`
  - `web-admin/src/features/simulation/model/storage.ts`
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
  - `web-admin/app/page.tsx`
  - `web-admin/src/features/catalog/components/catalog-write-panel.tsx`
  - `web-admin/src/features/catalog/components/catalog-write-panel.module.css`
  - `.context/planning/current_focus.md`
  - `.context/operations/work_log.md`
- Next step:
  - Add node graph mini-map and backend persistence endpoints for simulation drafts (replace localStorage-only draft lifecycle).

## Entry: 2026-02-08 (simulation builder graph + preview + backend persistence)
- Date: 2026-02-08
- Task: Continue simulation builder implementation with advanced UX flow and server persistence.
- Decision/Change:
  - Added transition graph visualization in `/simulation`:
    - nodes for screens,
    - edges for hotspot transitions,
    - node click focuses corresponding screen editor.
  - Added learner preview mode:
    - start/stop/restart preview,
    - hotspot-driven navigation through scenario,
    - runtime hint rendering,
    - learner path trail.
  - Added backend simulation draft storage module:
    - new table `simulation_drafts` (1 draft per owner user),
    - endpoints:
      - `GET /api/v1/simulation/drafts/current`
      - `POST /api/v1/simulation/drafts/current`
    - role gate: `administrator`, `methodologist`.
  - Added web-admin proxy endpoint:
    - `GET/POST /api/admin/simulation/drafts/current`.
  - Updated simulation UI sync strategy:
    - localStorage remains fast local cache,
    - background debounce save to backend draft endpoint,
    - server draft load on page open with local fallback.
  - Added backend schema test for simulation draft payload contract.
  - Revalidated checks:
    - backend: `ruff`, `pytest` (green),
    - web-admin: `prettier`, `tsc`, `next build` (green).
- Why:
  - Product needs no-code simulation flow that is not fragile across refreshes/devices.
  - Graph + preview reduces authoring mistakes before publish.
- Files touched:
  - `backend/app/api/router.py`
  - `backend/app/models.py`
  - `backend/app/modules/simulation/api/router.py`
  - `backend/app/modules/simulation/api/schemas.py`
  - `backend/app/modules/simulation/domain/services.py`
  - `backend/app/modules/simulation/infra/models.py`
  - `backend/app/modules/simulation/infra/repository.py`
  - `backend/migrations/versions/0004_add_simulation_drafts.py`
  - `backend/tests/test_simulation_schemas.py`
  - `web-admin/app/api/admin/simulation/drafts/current/route.ts`
  - `web-admin/src/features/simulation/api/client.ts`
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
  - `.context/planning/current_focus.md`
  - `.context/operations/work_log.md`
- Next step:
  - Connect simulation draft to concrete course/module/lesson context and add publish-time structural validation (entry screen, unreachable/dead-end checks).

## Entry: 2026-02-08 (simulation builder validation + editor UX hardening)
- Date: 2026-02-08
- Task: Complete simulation builder workflow with strict validation and stronger no-code editing controls.
- Decision/Change:
  - Upgraded `/simulation` editor UX:
    - screen actions now include move up/down and duplicate,
    - hotspot editor now supports hotspot duplication,
    - export is blocked when scenario has validation errors.
  - Wired scenario validation into UI (`validateSimulationDraft`):
    - visible validation panel with errors/warnings,
    - quick navigation from each validation issue to related screen/hotspot,
    - explicit export-block reason shown via flash message.
  - Added backend publish-time validation for `simulation` payload in catalog release creation:
    - hotspot geometry bounds checks,
    - numeric field checks (`x`, `y`, `width`, `height`),
    - `target_screen_key` existence checks across release screens.
  - Added backend tests for simulation payload validation paths.
  - Revalidated checks:
    - web-admin: `prettier --check`, `tsc --noEmit`, `next build` (green),
    - backend: `ruff`, `pytest` (green).
- Why:
  - Product focus is course-constructor quality; broken simulation JSON must be prevented before publish.
  - Methodologists need faster editor operations without manual JSON edits.
- Files touched:
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
  - `web-admin/src/features/simulation/model/validation.ts`
  - `web-admin/src/features/simulation/model/keys.ts`
  - `backend/app/modules/catalog/domain/services.py`
  - `backend/tests/test_catalog_simulation_validation.py`
  - `.context/operations/work_log.md`
- Next step:
  - Bind simulation drafts to concrete lesson entities (`course -> module -> lesson`) and add explicit completion-node validation for publish.

## Entry: 2026-02-08 (scope-aware simulation drafts + completion semantics)
- Date: 2026-02-08
- Task: Continue simulation constructor development with course-context draft isolation and explicit completion flow rules.
- Decision/Change:
  - Added draft scoping model for simulation persistence:
    - backend `simulation_drafts` now keyed by `(owner_user_id, scope_key)` instead of owner only,
    - API `GET/POST /api/v1/simulation/drafts/current` now accepts `scope_key` query param,
    - web-admin proxy forwards `scope_key`,
    - migration `0005_add_simulation_scope_key` applied.
  - Added shared scope builder in web-admin (`course/module/lesson -> scope_key`) and wired `/simulation` page:
    - preserves scope through language switch,
    - displays human-readable scope label,
    - links back to catalog builder with selected course context.
  - Improved simulation builder data model:
    - added `isCompletion` on screen draft,
    - export now emits `payload.is_start` and `payload.is_completion`.
  - Extended frontend scenario validation:
    - requires at least one completion screen,
    - checks reachable completion from start,
    - keeps dead-end warnings for reachable non-completion screens.
  - Extended backend release validation for simulation payload:
    - validates `is_start`/`is_completion` flags,
    - requires exactly one start screen,
    - requires at least one completion screen,
    - requires at least one completion reachable from start,
    - keeps geometry and target-screen checks for hotspots.
  - Catalog write panel now can open simulation builder in selected course scope and loads prepared simulation JSON from that scoped storage.
- Why:
  - Product needs isolated authoring contexts to avoid mixed drafts between courses.
  - A simulation must have a deterministic completion path before publication.
- Files touched:
  - `backend/app/modules/simulation/infra/models.py`
  - `backend/app/modules/simulation/infra/repository.py`
  - `backend/app/modules/simulation/domain/services.py`
  - `backend/app/modules/simulation/api/schemas.py`
  - `backend/app/modules/simulation/api/router.py`
  - `backend/migrations/versions/0005_add_simulation_scope_key.py`
  - `backend/app/modules/catalog/domain/services.py`
  - `backend/tests/test_simulation_schemas.py`
  - `backend/tests/test_catalog_simulation_validation.py`
  - `web-admin/app/api/admin/simulation/drafts/current/route.ts`
  - `web-admin/app/simulation/page.tsx`
  - `web-admin/src/features/simulation/model/scope.ts`
  - `web-admin/src/features/simulation/model/types.ts`
  - `web-admin/src/features/simulation/model/factories.ts`
  - `web-admin/src/features/simulation/model/export.ts`
  - `web-admin/src/features/simulation/model/storage.ts`
  - `web-admin/src/features/simulation/model/validation.ts`
  - `web-admin/src/features/simulation/api/client.ts`
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
  - `web-admin/src/features/catalog/components/catalog-write-panel.tsx`
  - `web-admin/src/features/catalog/components/catalog-write-panel.module.css`
  - `.context/operations/work_log.md`
- Next step:
  - Bind simulation drafts to persisted lesson entities (when lesson module lands) and add authoring tree navigation `course -> module -> lesson` directly in simulation builder.

## Entry: 2026-02-08 (simulation builder simple step-by-step flow)
- Date: 2026-02-08
- Task: Reduce overload in simulation builder and simplify authoring flow for course creators.
- Decision/Change:
  - Introduced dual-mode editor behavior:
    - `Simple mode` (default) for guided authoring,
    - `Advanced` mode for graph/validation/preview power tools.
  - Added step-by-step flow for simple mode:
    - `1. Screens` -> focus on scenario title and screen list,
    - `2. Hotspots and transitions` -> focus on canvas and hotspot editing,
    - `3. Export` -> focus on JSON preparation.
  - Implemented UI stepper controls and section visibility rules so only one step context is visible at a time in simple mode.
  - Kept advanced controls behind explicit mode switch (`data-advanced` blocks stay hidden in simple mode).
  - Added compact validation status block in export stage (`validationCompact*` styles).
  - Revalidated frontend checks:
    - `npx prettier --write src/features/simulation/ui/simulation-builder.tsx src/features/simulation/ui/simulation-builder.module.css`
    - `npm run build` (green)
    - `npm run type-check` (green; after build generated `.next/types`)
- Why:
  - Previous single-screen layout had too many simultaneous decisions for methodologists.
  - Step-by-step visibility significantly reduces cognitive load and prevents mode confusion.
- Files touched:
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
  - `.context/operations/work_log.md`
- Next step:
  - Trim simple-mode hotspot editor even further (optional auto-size presets + fewer numeric fields) while keeping full coordinates in advanced mode.

## Entry: 2026-02-08 (UX heuristics pass + design system foundation)
- Date: 2026-02-08
- Task: Continue UX improvements for simulation constructor and establish reusable design-system baseline for web/mobile.
- Decision/Change:
  - Applied heuristic simplification in simulation builder simple mode:
    - added step guidance hint per current stage,
    - disabled unavailable step transitions (`Export` locked until at least one hotspot exists),
    - added linear `Back/Next` step navigation to reduce mode confusion.
  - Added semantic design-token layer in web globals:
    - introduced `--text-*`, `--surface-*`, `--border-*`, `--interactive-*`, feedback tokens,
    - added shared spacing and radius scales (`--space-*`, `--radius-*`).
  - Added cross-platform design token source file:
    - `design-system/tokens.json` with primitive/semantic/component tokens and Android Compose mapping notes.
  - Added architecture doc for design system governance and migration path:
    - `.context/architecture/design_system.md`.
  - Updated context index to include new design-system document.
- Why:
  - User feedback highlighted cognitive overload in course simulation authoring flow.
  - Shared token language is needed to keep web-admin and future mobile UI visually and behaviorally consistent.
- Files touched:
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
  - `web-admin/app/globals.css`
  - `design-system/tokens.json`
  - `.context/architecture/design_system.md`
  - `.context/README.md`
  - `.context/operations/work_log.md`
- Next step:
  - Extract reusable web-admin primitives (`Button`, `Card`, `StepSwitcher`) bound to semantic tokens and apply them across `/`, `/catalog`, `/simulation`.

## Entry: 2026-02-08 (mobile home redesign with bottom nav + course tiles)
- Date: 2026-02-08
- Task: Implement key mobile UX update for home flow: bottom navigation, tiled course catalog, profile-only logout.
- Decision/Change:
  - Recreated `AppNavHost` after interrupted edit and rebuilt home flow around three tabs:
    - `Курсы`
    - `Урок`
    - `Профиль`
  - Implemented catalog tab as scalable square tile grid (`LazyVerticalGrid`) for large course lists.
  - Switched course cards to image-first presentation (photo cover + title/description overlay).
  - Removed `slug` from visible UI while preserving `slug` internally for API request (`getLatestCourseBundle`).
  - Moved logout action exclusively to profile tab and removed logout from main learning flow.
  - Added lesson tab container with progress, current screen content, navigation buttons, and return to catalog.
  - Added dependencies required by the new UI:
    - `androidx.compose.material:material-icons-extended`
    - `io.coil-kt:coil-compose`
  - Verified build gates:
    - `./gradlew :app:compileDebugKotlin --no-daemon` (green)
    - `./gradlew :core:data:test --no-daemon` (green)
- Why:
  - Product direction shifted to “key functionality first”: quick navigation across core sections, richer course browsing, and cleaner profile-centered account controls.
  - Image tiles improve scan speed and perceived quality versus text-only list with technical identifiers.
- Files touched:
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/navigation/AppNavHost.kt`
  - `mobile/app/build.gradle.kts`
  - `mobile/gradle/libs.versions.toml`
  - `.context/operations/work_log.md`
- Next step:
  - Replace temporary seeded cover images with backend-managed course cover URLs and add separate bottom-nav destination for progress/favorites if needed.

## Entry: 2026-02-08 (mobile architecture split: NavHost vs Route/Screen/UI)
- Date: 2026-02-08
- Task: Enforce architecture rule that `NavHost` must not contain screen implementation.
- Decision/Change:
  - Refactored app-level navigation:
    - `AppNavHost.kt` now contains only route graph and transitions (`auth`, `home`).
  - Moved home screen implementation out of `navigation` package into dedicated feature package:
    - `home/HomeRoute.kt` (state/effects wiring),
    - `home/HomeScreen.kt` (scaffold + tab switching),
    - `home/HomeTab.kt`,
    - `home/HomeViewModel.kt`,
    - `home/ui/*` for per-tab content components.
  - Removed obsolete `navigation/HomeViewModel.kt` to prevent architectural drift.
  - Added architecture policy document with placement rules and review checklist:
    - `mobile/docs/mobile-architecture.md`.
  - Linked architecture document from `mobile/README.md`.
  - Revalidated build after refactor:
    - `./gradlew :app:compileDebugKotlin --no-daemon` (green)
    - `./gradlew :app:assembleDebug --no-daemon` (green)
    - `./gradlew :core:data:test --no-daemon` (green)
- Why:
  - Keep navigation graph maintainable and prevent further growth of monolithic `NavHost` files.
  - Align mobile codebase with modular Android patterns (`Route -> Screen -> UI components`).
- Files touched:
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/navigation/AppNavHost.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/home/HomeRoute.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/home/HomeScreen.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/home/HomeTab.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/home/HomeViewModel.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/home/ui/CoursesContent.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/home/ui/LessonContent.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/home/ui/ProfileContent.kt`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/navigation/HomeViewModel.kt` (deleted)
  - `mobile/docs/mobile-architecture.md`
  - `mobile/README.md`
  - `.context/operations/work_log.md`
- Next step:
  - Extract `home` into `feature/home/api` + `feature/home/impl` modules and keep `app` only as composition root and app navigation.

## Entry: 2026-02-08 (web-admin reusable UI primitives rollout)
- Date: 2026-02-08
- Task: Finish reusable UI primitives integration across key web-admin pages (`/`, `/catalog`, `/simulation`).
- Decision/Change:
  - Added shared UI primitives under `web-admin/src/shared/ui/`:
    - `ActionButton` (variant-driven button),
    - `ActionLink` (link with button variants),
    - `SurfaceCard` (semantic container primitive),
    - `StepSwitcher` (reusable step tabs),
    - `cx` utility and shared primitive stylesheet.
  - Reused primitives in app pages:
    - `/` dashboard uses `SurfaceCard` and `ActionLink` for tiles and empty state,
    - `/catalog` uses `ActionLink` for dashboard/builder/reset links, `ActionButton` for filter apply, `SurfaceCard` for summary cards,
    - `/simulation` top navigation uses `ActionLink`.
  - Reused primitives in feature components:
    - `CatalogSidebar` now wraps container/empty states in `SurfaceCard`,
    - `CatalogReleaseList` now renders release cards and empty/error states with `SurfaceCard`.
  - Simplified simulation builder simple-step UI by switching to shared `StepSwitcher` and `ActionButton` in flow navigation.
  - Kept existing layout-specific CSS, but removed duplicated button/card styles where replaced by primitives.
  - Revalidated frontend checks:
    - `npx prettier --write` on touched web-admin files,
    - `npm run type-check` (green),
    - `npm run build` (green).
- Why:
  - Consolidates visual and interaction behavior into one reusable layer.
  - Reduces repeated CSS and makes future UX updates faster and safer.
  - Prepares direct portability of token/component conventions to mobile UI layer.
- Files touched:
  - `web-admin/src/shared/ui/primitives.module.css`
  - `web-admin/src/shared/ui/action-button.tsx`
  - `web-admin/src/shared/ui/action-link.tsx`
  - `web-admin/src/shared/ui/surface-card.tsx`
  - `web-admin/src/shared/ui/step-switcher.tsx`
  - `web-admin/src/shared/ui/classnames.ts`
  - `web-admin/app/page.tsx`
  - `web-admin/app/home.module.css`
  - `web-admin/app/catalog/page.tsx`
  - `web-admin/app/catalog/catalog.module.css`
  - `web-admin/app/simulation/page.tsx`
  - `web-admin/app/simulation/simulation.module.css`
  - `web-admin/src/features/catalog/components/catalog-sidebar.tsx`
  - `web-admin/src/features/catalog/components/catalog-release-list.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
  - `.context/operations/work_log.md`
- Next step:
  - Introduce shared `StatusBadge` and `FormField` primitives, then migrate `catalog` and `simulation` form blocks to eliminate remaining duplicated presentation logic.

## Entry: 2026-02-08 (simulation builder UX simplification + design system guide)
- Date: 2026-02-08
- Task: Reduce cognitive load in web-admin simulation builder and document reusable design-system approach for web/mobile.
- Decision/Change:
  - Simplified builder copy and step framing (shorter titles and helper text).
  - Kept `Simple` mode as the default and tightened progressive disclosure:
    - step 1 (`screens`): screen list + screen setup panel,
    - step 2 (`hotspots`): canvas + hotspot editor,
    - step 3 (`export`): validation summary + JSON export.
  - Removed duplicate guidance block in simple mode (`flowSteps` line), retained only focused step hint.
  - Added read-only canvas behavior on step 1 (no accidental hotspot creation before hotspot step).
  - Reduced header action noise in simple mode (hide reset action; keep contextual return to catalog).
  - Added reusable design system guide: `design-system/README.md` with token layers, mapping rules, and Compose alignment.
- Why:
  - Previous flow overloaded users with too many concurrent controls and repeated hints.
  - UX heuristic goals: one primary task per step, recognition over recall, progressive disclosure.
  - Needed a clear, reusable UI foundation for both `web-admin` and future mobile surfaces.
- Files touched:
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
  - `design-system/README.md`
  - `.context/operations/work_log.md`
- Verification:
  - `npm run build` (web-admin) -> passed.
  - `npm run type-check` (web-admin) -> passed.
- Next step:
  - Continue with phase 1 of simulation MVP: quick presets for common hotspot actions and lightweight autosuggestions for next-screen links.

## Entry: 2026-02-08 (mobile home refactor)
- Date: 2026-02-08
- Task: Refactor mobile `home` feature from `:app` to modular `:feature:home:api` + `:feature:home:impl`.
- Decision/Change:
  - Created `:feature:home:api` with `HOME_ROUTE` constant.
  - Created `:feature:home:impl` with all home screens, viewmodels, and UI components.
  - Moved files from `mobile/app/src/main/kotlin/com/digitaledu/mobile/home` to `mobile/feature/home/impl/...`.
  - Refactored package names to `com.digitaledu.feature.home.impl`.
  - Added `HomeNavigation.kt` in `impl` to expose `homeScreen` graph builder.
  - Updated `:app` dependencies and `AppNavHost` to use the new modules.
  - Added `libs.coil.compose` dependency to `:feature:home:impl`.
- Why:
  - To align with the modular architecture of the `auth` feature.
  - To decouple feature logic from the app module.
- Files touched:
  - `mobile/settings.gradle.kts`
  - `mobile/app/build.gradle.kts`
  - `mobile/feature/home/api/build.gradle.kts`
  - `mobile/feature/home/impl/build.gradle.kts`
  - `mobile/app/src/main/kotlin/com/digitaledu/mobile/navigation/AppNavHost.kt`
  - `mobile/feature/home/api/src/main/kotlin/com/digitaledu/feature/home/api/HomeRoute.kt`
  - `mobile/feature/home/impl/src/main/kotlin/com/digitaledu/feature/home/impl/HomeNavigation.kt`
  - Moved and refactored home feature files.
- Verification:
  - `./gradlew :feature:home:impl:assembleDebug` -> passed.
  - `./gradlew :app:assembleDebug` -> passed.
- Next step:
  - Proceed with Phase 1 tasks (lesson playback, smart hints).

## Entry: 2026-02-08 (KMP Phase 1)
- Date: 2026-02-08
- Task: KMP Migration Phase 1: Foundation.
- Decision/Change:
  - Updated `libs.versions.toml` with KMP dependencies (Ktor, Kotlinx, etc.).
  - Added `kotlin-multiplatform` plugin to root `build.gradle.kts`.
  - Converted `core:model`, `core:common`, `feature:auth:api`, and `feature:home:api` to KMP modules.
  - Moved sources from `src/main` to `src/commonMain` for converted modules.
  - Used `jvm()` target for now to maintain Android compatibility.
- Why:
  - To prepare the codebase for multiplatform support (iOS, Desktop).
- Files touched:
  - `mobile/gradle/libs.versions.toml`
  - `mobile/build.gradle.kts`
  - `mobile/core/model/build.gradle.kts`
  - `mobile/core/common/build.gradle.kts`
  - `mobile/feature/auth/api/build.gradle.kts`
  - `mobile/feature/home/api/build.gradle.kts`
  - Moved source files to `commonMain`.
- Verification:
  - `./gradlew :app:assembleDebug` -> passed.
- Next step:
  - Phase 2: Migrate Network Layer (Retrofit -> Ktor).

## Entry: 2026-02-08 (simulation media library for fast screen authoring)
- Date: 2026-02-08
- Task: Add image media library so course simulation screens can be assembled quickly without external links.
- Decision/Change:
  - Added backend media asset storage for simulation builder:
    - DB table `simulation_media_assets` (owner, scope, filename, content type, size, storage key).
    - Local file storage root from config: `APP_SIMULATION_MEDIA_DIR` (default `storage/simulation_media`).
    - Size guard: `APP_SIMULATION_MEDIA_MAX_MB` (default 8 MB).
  - Added simulation media API endpoints (role-protected):
    - `GET /api/v1/simulation/media`
    - `POST /api/v1/simulation/media/upload`
    - `GET /api/v1/simulation/media/{asset_id}/file`
  - Added web-admin proxy routes:
    - `GET/POST /api/admin/simulation/media`
    - `GET /api/admin/simulation/media/[assetId]/file`
  - Extended simulation builder UI with media library block:
    - image upload,
    - search by filename,
    - thumbnail grid,
    - one-click select image to current screen.
- Why:
  - Screen authoring was bottlenecked by external image URLs and context switching.
  - Internal media library reduces friction and speeds up no-code simulation construction.
- Files touched:
  - `backend/app/modules/simulation/*`
  - `backend/app/models.py`
  - `backend/app/core/config.py`
  - `backend/migrations/versions/0006_add_simulation_media_assets.py`
  - `backend/requirements.txt`
  - `web-admin/app/api/admin/simulation/media/*`
  - `web-admin/src/features/simulation/api/client.ts`
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
  - `.context/operations/work_log.md`
- Verification:
  - `ruff check` (targeted backend files) -> passed.
  - `npm run type-check` (web-admin) -> passed.
  - `npm run build` (web-admin) -> passed.
  - `PYTHONPATH=. pytest -q tests/test_simulation_schemas.py tests/test_catalog_simulation_validation.py` -> passed.
- Next step:
  - Add optional tags/folders for media assets and quick filters by flow type (bank/government/messenger).

## Entry: 2026-02-08 (KMP Phase 2)
- Date: 2026-02-08
- Task: KMP Migration Phase 2: Networking.
- Decision/Change:
  - Migrated network layer from Retrofit/OkHttp to Ktor Client.
  - Converted `core:network` to KMP module (`commonMain`).
  - Implemented `KtorAuthNetworkDataSource` and `KtorCatalogNetworkDataSource` in `commonMain`.
  - Created `KtorNetworkFactory` in `jvmMain` to provide configured Ktor client (using OkHttp engine for now).
  - Updated `core:data` repositories to use the new Ktor factory.
- Why:
  - To enable networking on non-Android platforms (iOS, Desktop).
- Files touched:
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/ktor/...` (New Ktor sources)
  - `mobile/core/network/src/jvmMain/kotlin/com/digitaledu/core/network/KtorNetworkFactory.kt` (New factory)
  - `mobile/core/data/src/main/kotlin/com/digitaledu/core/data/auth/NetworkAuthRepository.kt` (Updated)
  - `mobile/core/data/src/main/kotlin/com/digitaledu/core/data/catalog/NetworkCatalogRepository.kt` (Updated)
  - `mobile/core/network/build.gradle.kts` (KMP + Dependencies)
- Verification:
  - `./gradlew :app:assembleDebug` -> passed.
- Next step:
  - Phase 3: UI Foundation (Compose Multiplatform).

## Entry: 2026-02-08 (simulation app binding + version range)
- Date: 2026-02-08
- Task: Finish app/version binding in simulation builder media workflow.
- Decision/Change:
  - Added explicit "App and release" block in simulation builder (package name, store, min/max versions, optional release date/store URL).
  - Bound media library list/upload requests to the selected app context (`app_package_name`, `store_type`, `min_supported_version`, `max_supported_version`, `released_at`).
  - Added frontend validation guard so media library does not call backend while app package/version/date are invalid.
  - Fixed `SimulationStoreType` normalization typing in draft validation.
- Why:
  - Simulation screens must be reusable per concrete app/version context and quick to locate when building courses.
  - Prevent noisy API errors during draft editing.
- Files touched:
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
  - `web-admin/src/features/simulation/model/validation.ts`
  - `.context/operations/work_log.md`
- Verification:
  - `npm run --prefix web-admin type-check` -> passed.
  - `npm run --prefix web-admin build` -> passed.
  - `PYTHONPATH=. pytest -q tests/test_simulation_schemas.py tests/test_catalog_simulation_validation.py` (in `backend/`) -> passed.
- Next step:
  - Extend backend media search to support version-range overlap matching in addition to exact range matching.

## Entry: 2026-02-08 (web-admin auth loop fix)
- Date: 2026-02-08
- Task: Fix repeated login loop in web-admin caused by auth cookie persistence edge case.
- Decision/Change:
  - Added `resolveSecureCookieFlag(request)` utility for auth cookies.
  - Updated cookie write/clear logic in login, otp-verify, refresh, and logout routes to use request-aware secure flag.
  - Localhost / 127.0.0.1 now explicitly uses non-secure cookies even when runtime is `NODE_ENV=production`.
- Why:
  - In local production-like runs over HTTP, `secure=true` cookies are ignored by browser, causing endless redirects to `/auth`.
- Files touched:
  - `web-admin/src/shared/auth/cookie-security.ts`
  - `web-admin/app/api/admin/auth/login/route.ts`
  - `web-admin/app/api/admin/auth/otp/verify/route.ts`
  - `web-admin/app/api/admin/auth/refresh/route.ts`
  - `web-admin/app/api/admin/auth/logout/route.ts`
  - `.context/operations/work_log.md`
- Verification:
  - `npm run --prefix web-admin type-check` -> passed.
  - `npm run --prefix web-admin build` -> passed.
- Next step:
  - Add a small e2e auth smoke test (login -> / -> /api/admin/auth/me) for CI to catch cookie regressions early.

## Entry: 2026-02-08 (python-multipart runtime fix)
- Date: 2026-02-08
- Task: Resolve backend startup crash on simulation media upload route.
- Decision/Change:
  - Installed missing `python-multipart` in local Python environment.
  - Updated `run` dependency precheck to require `multipart` import (`uvicorn`, `alembic`, `multipart`).
- Why:
  - FastAPI `UploadFile` endpoints require multipart parser at import-time; without it server crashes during startup.
- Files touched:
  - `run`
  - `.context/operations/work_log.md`
- Verification:
  - `python3 -c "import multipart, uvicorn, alembic"` -> passed.
  - `bash -n run` -> passed.
- Next step:
  - Re-run `./run` and verify `/simulation` media upload endpoint initializes without runtime error.

## Entry: 2026-02-09 (run pre-cleanup for occupied ports)
- Date: 2026-02-09
- Task: Make `./run` resilient to already running backend/web processes.
- Decision/Change:
  - Added `kill_listening_on_port` helper in `run`.
  - Before starting dev servers, script now kills processes listening on `BACKEND_PORT` and `WEB_PORT` (with force fallback).
  - Added `lsof` to required runtime commands for the script.
- Why:
  - Re-running `./run` often failed with "address already in use" when previous processes were left alive.
- Files touched:
  - `run`
  - `.context/operations/work_log.md`
- Verification:
  - `bash -n run` -> passed.
- Next step:
  - Optionally add `--no-kill` flag for cases where occupied ports should be preserved.

## Entry: 2026-02-08 (simulation builder UX simplification)
- Date: 2026-02-08
- Task: Reduce simulation-builder cognitive load and remove manual package-name friction.
- Decision/Change:
  - Added store URL helper in simulation target-app block:
    - parses `packageName` from Google Play / RuStore links,
    - auto-detects store type from URL host (`play_market` / `rustore`),
    - shows immediate success/error flash feedback.
  - Refactored heavy builder subsections to collapsible panels (progressive disclosure):
    - app/release binding,
    - presets,
    - media library,
    - transition graph,
    - hotspot editor,
    - transitions list,
    - validation,
    - preview,
    - export JSON.
  - Added reusable collapse-toggle styles and helper copy for URL-driven package extraction.
  - Verified web-admin quality gates after refactor:
    - `npm run --prefix web-admin type-check` ✅
    - `npm run --prefix web-admin build` ✅
- Why:
  - Authors were overloaded by too many simultaneously visible controls.
  - Requiring manual `packageName` lookup for third-party apps is poor UX and slows course authoring.
- Files touched:
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
  - `.context/operations/work_log.md`
- Next step:
  - Add URL helper for app version autofill (optional) and quick “choose recent app bindings” presets.

## Entry: 2026-02-08 (app-name-first simulation binding)
- Date: 2026-02-08
- Task: Hide technical package name and let course authors work by app name.
- Decision/Change:
  - Extended simulation target-app draft model with `appName`.
  - Refactored simulation builder UX:
    - removed manual package-name field from UI,
    - added `Application name` field,
    - added URL helper to fill app details from store link,
    - technical package id is auto-generated from app name if no store package is available.
  - Added utility model `app-id.ts` for package normalization/derivation logic.
  - Updated draft normalization/validation to support `appName` and preserve backwards compatibility for old drafts without this field.
  - Kept backend media-binding contract unchanged (`app_package_name`) to avoid schema/API break.
- Why:
  - Manual package-name lookup is not user-friendly for non-technical course authors.
  - App-name-first workflow improves speed and reduces cognitive load in simulation authoring.
- Files touched:
  - `web-admin/src/features/simulation/model/types.ts`
  - `web-admin/src/features/simulation/model/factories.ts`
  - `web-admin/src/features/simulation/model/validation.ts`
  - `web-admin/src/features/simulation/model/app-id.ts`
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
- Next step:
  - Add backend endpoint to resolve app metadata by public store URL/title to improve quality of auto-detected identifiers.

## Entry: 2026-02-08 (collapsible icon polish)
- Date: 2026-02-08
- Task: Remove noisy collapse labels and make section toggles visually cleaner.
- Decision/Change:
  - Replaced visible “expand/collapse” text with chevron icon controls.
  - Added animated chevron rotation for open/closed state.
  - Added hover/focus/active polish for section headers.
  - Kept accessibility via screen-reader-only expanded/collapsed label text.
- Why:
  - Repeated text labels increased visual noise and made builder feel heavy.
- Files touched:
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
- Next step:
  - Unify icon language across catalog and dashboard cards.

## Entry: 2026-02-08 (collapse-icon scale hotfix)
- Date: 2026-02-08
- Task: Fix oversized collapse icon rendering in simulation builder.
- Decision/Change:
  - Replaced inline SVG chevron with typography-based glyph icon (`⌄`) in a fixed-size icon chip.
  - Preserved open/close animation with rotation on expanded state.
- Why:
  - Some environments rendered the SVG icon at incorrect scale; glyph-based icon avoids SVG scaling conflicts.
- Files touched:
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
- Next step:
  - Validate the same control in Safari/Chrome and keep icon system consistent across admin pages.

## Entry: 2026-02-08 (collapse-label and app-name URL behavior fix)
- Date: 2026-02-08
- Task: Fix remaining collapse-label visibility and adjust URL extraction behavior.
- Decision/Change:
  - Removed screen-reader text node from collapse icon rendering to prevent accidental visible “collapse/expand” text in Safari-like rendering edge cases.
  - Tuned collapse-toggle spacing and icon alignment.
  - Changed store URL extraction behavior:
    - keep `appName` as manual user field,
    - update only technical id (`packageName`) and store type from URL.
- Why:
  - UI still showed visible “collapse” text and icon spacing looked broken.
  - User confirmed URL-derived app title is unreliable and should not overwrite manual app name.
- Files touched:
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
- Next step:
  - Add optional app-search provider integration (Play/RuStore metadata API) for better title suggestions.

## Entry: 2026-02-08 (MCP tooling for UI visibility + web research)
- Date: 2026-02-08
- Task: Enable practical free tooling so assistant can inspect UI and research current info.
- Decision/Change:
  - Added global MCP server `playwright` (`npx -y @playwright/mcp@latest`) for browser interaction and visual checks.
  - Confirmed existing `context7` remains enabled for up-to-date library docs.
  - For internet search MCP, recommended Brave Search MCP with free API tier (requires user API key).
- Why:
  - User requested automatic UI visibility and online research with free options.
- Files touched:
  - `.context/operations/work_log.md`
- Next step:
  - Add Brave MCP once user provides `BRAVE_API_KEY`.

## Entry: 2026-02-09 (no-key web search MCP)
- Date: 2026-02-09
- Task: Remove key dependency for internet research MCP and keep only open/no-key option.
- Decision/Change:
  - Verified Brave MCP is not connected in current environment.
  - Added global `searxng-public` MCP (`npx -y mcp-searxng-public`) with public SearXNG fallback URLs.
  - Kept `playwright` + `context7` as primary UI/docs stack.
  - Updated `.context/operations/mcp_integrations.md` to reflect current MCP baseline and no-key policy.
- Why:
  - User requested internet research without API keys and minimal setup friction.
- Files touched:
  - `.context/operations/mcp_integrations.md`
  - `.context/operations/work_log.md`
- Next step:
  - If search stability is insufficient, add optional self-hosted SearXNG instance for deterministic uptime.

## Entry: 2026-02-09 (`run` resilience for stale processes + multipart precheck)
- Date: 2026-02-09
- Task: Improve local startup reliability and prevent recurring FastAPI upload crash.
- Decision/Change:
  - Added `.run` state directory with PID files for backend/web processes.
  - On startup, `run` now stops stale processes from previous sessions via PID files before spawning new ones.
  - Strengthened dependency precheck:
    - keep base imports (`uvicorn`, `alembic`),
    - explicitly require installed distribution `python-multipart` (not just `multipart` module import).
  - Cleanup now removes PID files on shutdown.
- Why:
  - Re-runs could fail when previous dev processes were left alive.
  - FastAPI upload routes can fail at startup when `python-multipart` distribution is missing or mismatched.
- Files touched:
  - `run`
  - `.context/operations/work_log.md`
- Next step:
  - Re-run `./run` and verify backend starts cleanly and `/simulation` upload routes initialize without multipart errors.

## Entry: 2026-02-09 (fresh dependency lookup automation)
- Date: 2026-02-09
- Task: Connect no-key mechanisms to keep dependency versions and library usage fresh.
- Decision/Change:
  - Added global MCP servers:
    - `npm-registry` (`@arvoretech/npm-registry-mcp`) for live npm versions/metadata.
    - `maven-deps` (`mcp-maven-deps`) for Maven/Gradle latest-version checks.
  - Kept `context7` as primary up-to-date docs source for best-practice code usage.
  - Added `.github/dependabot.yml` with weekly update automation for:
    - `backend` (`pip`),
    - `web-admin` (`npm`),
    - `mobile` (`gradle`),
    - Docker and GitHub Actions.
  - Added local manual check target `make deps-check` (npm outdated + pip dry-run upgrade check).
- Why:
  - User asked for a connected workflow that continuously surfaces fresh library versions without API keys.
- Files touched:
  - `.github/dependabot.yml`
  - `Makefile`
  - `README.md`
  - `.context/operations/mcp_integrations.md`
  - `.context/operations/dependency_policy.md`
  - `.context/operations/work_log.md`
- Next step:
  - Enable Dependabot alerts/PRs in the remote repository UI and apply first update wave after CI verification.

## Entry: 2026-02-09 (docfork MCP enabled)
- Date: 2026-02-09
- Task: Add Docfork as an additional up-to-date docs source.
- Decision/Change:
  - Added global MCP server `docfork` via `npx -y docfork`.
  - Confirmed server appears in `codex mcp list` as enabled.
  - Updated `.context/operations/mcp_integrations.md` with usage note.
- Why:
  - User requested Docfork integration to improve freshness of code/library documentation context.
- Files touched:
  - `.context/operations/mcp_integrations.md`
  - `.context/operations/work_log.md`
- Next step:
  - For private/team docs, optionally configure Docfork API key/OAuth mode in MCP config.

## Entry: 2026-02-09 (CodeGraphContext MCP enabled)
- Date: 2026-02-09
- Task: Install and connect CodeGraphContext MCP for code graph context retrieval.
- Decision/Change:
  - Installed PyPI package `codegraphcontext` (`0.2.1`) in local user Python environment.
  - Verified MCP entrypoint and command help: `python3 -m codegraphcontext mcp start`.
  - Added global MCP server `codegraphcontext` in Codex config.
- Why:
  - User requested CodeGraphContext integration to enrich code navigation/context tooling.
- Files touched:
  - `.context/operations/mcp_integrations.md`
  - `.context/operations/work_log.md`
- Next step:
  - Run `codegraphcontext` indexing flow against project repo when first advanced graph queries are needed.

## Entry: 2026-02-09 (auto CodeGraphContext skill + project policy)
- Date: 2026-02-09
- Task: Make CodeGraphContext usage automatic by default for repository context discovery.
- Decision/Change:
  - Created new reusable skill `codegraphcontext-first` at `$CODEX_HOME/skills/codegraphcontext-first`.
  - Added explicit graph-first policy to `Claude.md`:
    - use `codegraphcontext` first for code navigation and impact analysis,
    - use `rg` only as scoped fallback when graph data is unavailable/incomplete.
  - Added skill entry to `.context/operations/skills_catalog.md`.
  - Validated skill structure with `quick_validate.py` (status: valid).
- Why:
  - User asked to avoid manual prompting and enforce automatic context lookup through CodeGraphContext.
- Files touched:
  - `Claude.md`
  - `.context/operations/skills_catalog.md`
  - `.context/operations/work_log.md`
  - `/Users/npopov/.codex/skills/codegraphcontext-first/SKILL.md`
  - `/Users/npopov/.codex/skills/codegraphcontext-first/agents/openai.yaml`
- Next step:
  - Start next dev tasks with graph-first workflow and verify that fallback to `rg` is used only when required.

## Entry: 2026-02-09 (CodeGraphContext reindex without build artifacts)
- Date: 2026-02-09
- Task: Re-index repository with build/output directories excluded.
- Decision/Change:
  - Updated global `codegraphcontext` setting `IGNORE_DIRS` to include build/output folders (`build`, `dist`, `.next`, `.gradle`, `.gradle-home`, `.turbo`, `node_modules`, etc.).
  - Rebuilt index with `python3 -m codegraphcontext index . --force`.
  - Verified by query that files from ignored build-like paths are absent (`build_or_cache_files = 0`).
- Why:
  - User requested to avoid indexing build artifacts and keep graph focused on source code.
- Files touched:
  - `/Users/npopov/.codegraphcontext/.env`
  - `.context/operations/work_log.md`
- Next step:
  - Continue feature work using graph-first context queries over clean source-only index.

## Entry: 2026-02-09 (`run` integrates CodeGraphContext watcher)
- Date: 2026-02-09
- Task: Add automatic `codegraphcontext watch` startup into local `./run` workflow.
- Decision/Change:
  - Extended `run` script to start `python3 -m codegraphcontext watch` by default.
  - Added watcher process lifecycle management with PID file:
    - `.run/codegraph-watch.pid`
    - stale watcher cleanup before startup,
    - graceful stop in `cleanup`.
  - Added environment controls:
    - `CGC_WATCH=0` to disable watcher.
    - `CGC_WATCH_PATH` to override watched path.
  - Updated runbook with unified `./run` startup flow and watcher notes.
- Why:
  - User requested fully automatic index updates during development, without manual `watch` command.
- Files touched:
  - `run`
  - `.context/operations/runbook_local.md`
  - `.context/operations/work_log.md`
- Next step:
  - Start `./run` and verify watcher process appears and survives normal dev flow.

## Entry: 2026-02-09 (Knowledge Graph Memory Server integration)
- Date: 2026-02-09
- Task: Add `knowledge-memory` MCP server and define best-practice usage policy.
- Decision/Change:
  - Added global MCP server:
    - `knowledge-memory` -> `npx -y @modelcontextprotocol/server-memory`
    - `MEMORY_FILE_PATH=/Users/npopov/Desktop/ВУЗ/ВКР/Project/.context/operations/kg_memory.jsonl`
  - Added project policy for memory usage and safety:
    - `Claude.md` (mandatory rules + memory policy section),
    - `.context/operations/knowledge_memory_policy.md`,
    - `.context/operations/mcp_integrations.md` updates.
  - Created memory storage file `kg_memory.jsonl` in `.context/operations/`.
- Why:
  - User requested persistent knowledge graph memory with best-practice governance.
- Files touched:
  - `Claude.md`
  - `.context/operations/mcp_integrations.md`
  - `.context/operations/knowledge_memory_policy.md`
  - `.context/operations/work_log.md`
  - `.context/README.md`
- Next step:
  - Start capturing stable architecture/RBAC/domain facts into memory graph with source references.

## Entry: 2026-02-09 (pin memory server to official MCP release)
- Date: 2026-02-09
- Task: Align memory MCP to official `modelcontextprotocol/servers` memory implementation with pinned version.
- Decision/Change:
  - Confirmed package provenance:
    - `@modelcontextprotocol/server-memory` repository -> `https://github.com/modelcontextprotocol/servers.git`
  - Reconfigured MCP server `knowledge-memory` to pinned package version:
    - `npx -y @modelcontextprotocol/server-memory@2026.1.26`
- Why:
  - Ensure deterministic behavior and avoid accidental changes from unpinned `latest`.
- Files touched:
  - `/Users/npopov/.codex/config.toml`
  - `.context/operations/work_log.md`
- Next step:
  - Use pinned memory server for project knowledge entries under `kg_memory.jsonl`.

## Entry: 2026-02-09 (install Playwright CLI from microsoft/playwright-cli)
- Date: 2026-02-09
- Task: Install Playwright CLI alongside MCP setup for token-efficient browser automation flows.
- Decision/Change:
  - Installed global package:
    - `npm install -g @playwright/cli@latest`
  - Installed CLI skills in project workspace:
    - `playwright-cli install --skills`
  - Verified command availability (`playwright-cli --version` -> `0.1.0`).
- Why:
  - User requested `https://github.com/microsoft/playwright-cli`; CLI mode is useful for concise agent/browser command loops.
- Files touched:
  - `.context/operations/work_log.md`
  - local workspace skill folder: `/Users/npopov/Desktop/ВУЗ/ВКР/Project/.claude/skills/playwright-cli`
- Next step:
  - Use `playwright-cli` for targeted browser tasks; keep Playwright MCP for richer introspection scenarios.

## Entry: 2026-02-09 (seed knowledge-memory from full `.context`)
- Date: 2026-02-09
- Task: Bootstrap project knowledge graph memory from existing context docs.
- Decision/Change:
  - Added script: `scripts/seed_kg_memory.py`.
  - Seeded memory file with normalized entities/relations from all `.context/**/*.md` plus core domain and RBAC entities.
  - Executed re-seed with replace mode:
    - `python3 scripts/seed_kg_memory.py --project-root /Users/npopov/Desktop/ВУЗ/ВКР/Project --memory-file .context/operations/kg_memory.jsonl --replace`
  - Result:
    - `entities=36`
    - `relations=63`
    - validated JSONL records: `99`.
- Why:
  - User asked to preload existing project context into knowledge graph memory in best-practice form.
- Files touched:
  - `scripts/seed_kg_memory.py`
  - `.context/operations/kg_memory.jsonl`
  - `.context/operations/knowledge_memory_policy.md`
  - `.context/operations/work_log.md`
- Next step:
  - Keep memory synchronized after major context updates by re-running seed or adding incremental memory entries.

## Entry: 2026-02-09 (automatic knowledge-memory sync in `run`)
- Date: 2026-02-09
- Task: Automate memory sync so it runs only when needed.
- Decision/Change:
  - Added startup memory-sync step to `run`:
    - auto mode compares timestamps and re-seeds only if `.context/**/*.md`, `Claude.md`, or `scripts/seed_kg_memory.py` is newer than memory file.
    - force mode always re-seeds (`KG_MEMORY_SYNC_MODE=force`).
  - Added env controls:
    - `KG_MEMORY_SYNC=0|1`
    - `KG_MEMORY_SYNC_MODE=auto|force`
    - `KG_MEMORY_FILE=/path/to/jsonl`
  - Added Makefile shortcuts:
    - `make kg-sync`
    - `make kg-sync-force`
- Why:
  - User requested full automation “when needed” without unnecessary re-seeding on every run.
- Files touched:
  - `run`
  - `Makefile`
  - `.context/operations/runbook_local.md`
  - `.context/operations/knowledge_memory_policy.md`
  - `.context/operations/work_log.md`
- Next step:
  - Validate in live startup (`./run`) that memory sync logs “up to date” when unchanged and syncs after context edits.

## Entry: 2026-02-10 (run script hardening: stale processes + multipart safety)
- Date: 2026-02-10
- Task: Make local startup more stable by killing stale processes before boot and preventing FastAPI multipart startup failure.
- Decision/Change:
  - `run` now performs stale-process cleanup before startup:
    - kills listeners on backend/web ports,
    - stops PID-file processes from previous run,
    - stops matching stale `uvicorn`/`next dev` and CodeGraph watchers.
  - Added backend dependency auto-bootstrap switch:
    - `AUTO_INSTALL_BACKEND_DEPS=1` (default) installs missing backend deps when `uvicorn/alembic` are absent.
  - Replaced weak multipart check with real FastAPI runtime check:
    - executes `ensure_multipart_is_installed()` and auto-installs `python-multipart` if needed.
  - Verified full local startup via `./run`:
    - Postgres container up, migrations applied, backend/web started, CodeGraph watcher started, graceful stop with `Ctrl+C`.
- Why:
  - User reported startup instability (`address already in use`) and FastAPI crash requiring `python-multipart`.
- Files touched:
  - `run`
  - `.context/operations/work_log.md`
- Next step:
  - If needed, add optional strict mode (`AUTO_INSTALL_BACKEND_DEPS=0`) in CI/local docs as explicit policy.

## Entry: 2026-02-10 (CodeGraphContext CLI-first policy locked)
- Date: 2026-02-10
- Task: Enforce permanent preference of CodeGraphContext CLI over MCP wrappers.
- Decision/Change:
  - Updated project manifest rule in `Claude.md`:
    - code context discovery must start with `python3 -m codegraphcontext ...`.
    - MCP wrappers are fallback-only.
  - Updated execution workflow in `.context/operations/workflow.md`:
    - added mandatory CLI-first step for non-trivial cross-file work.
    - added explicit fallback chain (`CLI -> MCP wrapper -> rg`).
  - Updated operations docs:
    - `.context/operations/runbook_local.md` with concrete CLI command set.
    - `.context/operations/mcp_integrations.md` with CLI-first usage note.
- Why:
  - User requested to always use CodeGraphContext through CLI and to закрепить this as a stable project rule.
- Files touched:
  - `Claude.md`
  - `.context/operations/workflow.md`
  - `.context/operations/runbook_local.md`
  - `.context/operations/mcp_integrations.md`
  - `.context/operations/work_log.md`
- Next step:
  - Keep applying this policy in future tasks and report fallback reason if CLI cannot be used.

## Entry: 2026-02-10 (project-level cgc CLI shortcuts)
- Date: 2026-02-10
- Task: Add project-level shortcuts to standardize CodeGraphContext CLI usage.
- Decision/Change:
  - Added Make targets:
    - `make cgc-index`
    - `make cgc-watch`
    - `make cgc-list`
    - `make cgc-mcp`
  - Added configurable path variable:
    - `CGC_PATH` (defaults to project root).
  - Updated local runbook with new shortcuts.
- Why:
  - User asked to lock CLI usage and simplify routine usage with a short command path.
- Files touched:
  - `Makefile`
  - `.context/operations/runbook_local.md`
  - `.context/operations/work_log.md`
- Next step:
  - Keep using `make cgc-*` as default team commands for graph indexing/watch.

## Entry: 2026-02-10 (simulation UX: store resolve hardening + Safari-safe icon/layout)
- Date: 2026-02-10
- Task: Continue improving simulation builder UX and remove failures with store link parsing.
- Decision/Change:
  - Hardened store resolver endpoint (`web-admin` API route):
    - rejects challenge/429 URLs before fetch,
    - expands app-name extraction from actual page content (`h1/h2`, JSON-LD, meta),
    - filters anti-bot markers from candidate titles,
    - improves URL-based fallback app naming.
  - Improved builder UX in target-app block:
    - added explicit user-facing error for challenge/429 URLs,
    - surfaces backend error text in flash message instead of generic text,
    - removed fragile inline icon sizing styles and switched to stable fixed-size icon slot.
  - Improved mobile-screen media presentation:
    - smaller, portrait-style media cards,
    - reduced oversized canvas/preview frame dimensions for a more phone-like visual scale.
  - Validated:
    - `web-admin` type-check passes,
    - Prettier check passes,
    - store resolve challenge URL returns `422` with clear message,
    - simulation library endpoint via Next API returns `200` in local validation.
- Why:
  - User reported incorrect app names from store URLs, oversized icons in Safari, and overloaded visual scale for screen previews.
- Files touched:
  - `web-admin/app/api/admin/simulation/store/resolve/route.ts`
  - `web-admin/src/features/simulation/ui/simulation-builder.tsx`
  - `web-admin/src/features/simulation/ui/simulation-builder.module.css`
  - `.context/operations/work_log.md`
- Next step:
  - Validate visually in Safari with real store links and iterate only on remaining browser-specific rendering edge cases.

## Entry: 2026-02-13 (rename web module + landing refresh)
- Date: 2026-02-13
- Task: Rename `web-admin` module to `web` and fix/apply landing styles.
- Decision/Change:
  - Renamed directory `web-admin/` -> `web/`.
  - Updated all repository-level references (`run`, `Makefile`, pre-commit hooks, CI workflow, Dependabot, root README, design-system docs/tokens, npm package metadata).
  - Reworked landing page UI in `web/app/page.tsx` + `web/src/features/landing/ui/*` using a stronger, block-based visual system (hero, features, about, footer).
  - Stabilized global Tailwind v4 setup in `web/app/globals.css`:
    - switched font tokens to non-recursive variables (`--font-outfit`, `--font-work`),
    - added utility classes for animation delays,
    - added reduced-motion fallback and consistent focus-visible ring states.
  - Updated `web/app/layout.tsx` fonts to `Outfit` + `Work Sans` and aligned metadata title with new module name.
- Why:
  - User requested folder rename to `web` and a proper landing page while fixing style application issues.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npx eslint app/page.tsx app/layout.tsx src/features/landing/ui/Hero.tsx src/features/landing/ui/Features.tsx src/features/landing/ui/About.tsx src/features/landing/ui/Footer.tsx` -> passed.
- Files touched:
  - `web/**`
  - `run`
  - `Makefile`
  - `scripts/pre-commit.sh`
  - `.github/workflows/ci.yml`
  - `.github/dependabot.yml`
  - `README.md`
  - `design-system/README.md`
  - `design-system/tokens.json`
  - `.context/operations/work_log.md`
- Next step:
  - If needed, normalize remaining docs/instructions that still semantically refer to "web admin" as product wording (without changing module path).

## Entry: 2026-02-13 (web lint green for CommonJS helper scripts)
- Date: 2026-02-13
- Task: Make full `web` lint command pass after module rename.
- Decision/Change:
  - Added ESLint override for `**/*.cjs` to disable `@typescript-eslint/no-require-imports` in CommonJS helper scripts.
- Why:
  - `web/test-*.cjs` are utility scripts written in CommonJS and were failing lint as hard errors.
- Validation:
  - `cd web && npm run lint` -> passed (0 errors, warnings only).
- Files touched:
  - `web/eslint.config.mjs`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (legacy web-admin command compatibility)
- Date: 2026-02-13
- Task: Fix startup failure for legacy `cd web-admin && npm run dev` command after module rename.
- Decision/Change:
  - Added compatibility wrapper in `web-admin/package.json` that proxies scripts to `../web` via `npm --prefix ../web ...`.
  - Added `web-admin/README.md` explaining that active frontend lives in `web/`.
- Why:
  - User command still referenced `web-admin`, causing `ENOENT` on missing `package.json`.
- Validation:
  - `cd web-admin && npm run dev -- --hostname 127.0.0.1 --port 3000` now resolves to `web` scripts (no ENOENT).
- Files touched:
  - `web-admin/package.json`
  - `web-admin/README.md`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (landing localization + layout stability for Prosvet)
- Date: 2026-02-13
- Task: Add product naming `Prosvet`, remove remaining English text from landing, and fix drifting layout.
- Decision/Change:
  - Updated landing metadata and branding to `Просвет (Prosvet)`.
  - Localized remaining English UI copy to Russian in Hero/Features/About/Footer.
  - Reworked features grid to avoid visual drift on responsive breakpoints:
    - removed fixed row height (`md:auto-rows-[170px]`),
    - switched to flexible grid (`sm:grid-cols-2`, `lg:grid-cols-3`) with stable card min-heights,
    - kept highlighted first card as `lg:col-span-2` with larger minimum height.
- Why:
  - User reported mixed-language UI and unstable layout rendering.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with warnings only (0 errors).
- Files touched:
  - `web/app/layout.tsx`
  - `web/src/features/landing/ui/Hero.tsx`
  - `web/src/features/landing/ui/Features.tsx`
  - `web/src/features/landing/ui/About.tsx`
  - `web/src/features/landing/ui/Footer.tsx`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (landing: full de-anglicization + runtime restart)
- Date: 2026-02-13
- Task: Remove remaining anglicisms from landing and restart local services.
- Decision/Change:
  - Replaced remaining English/transliterated brand text in public UI with Russian-only wording (`Просвет`).
  - Updated social link labels to neutral Russian names.
  - Restarted local runtime manually (without `./run`, because Docker daemon is currently off):
    - `web` on `127.0.0.1:3000`
    - `backend` on `127.0.0.1:8000`
- Why:
  - User requested full language localization and immediate restart.
- Validation:
  - `web` dev server: ready, responses on `/` observed in log.
  - `backend` uvicorn: startup complete, listening on `127.0.0.1:8000`.
- Files touched:
  - `web/app/layout.tsx`
  - `web/src/features/landing/ui/Hero.tsx`
  - `web/src/features/landing/ui/Footer.tsx`
  - `.context/operations/work_log.md`
- Refinement:
  - Replaced remaining borrowed wording in hero/about copy (`трек` -> `путь`, `квиз` -> `тест`, `демо-дашборд` -> `демонстрационная панель`).
- Refinement:
  - Reduced vertical spacing between landing sections for denser layout:
    - Hero: `pt/pb` from `14/16` (`sm 20/20`) to `10/10` (`sm 12/12`, `lg 14/14`)
    - Features: `py` from `20/24` to `12/14`
    - About: `py` from `20/24` to `12/14`
    - Footer: `py` from `14` to `10/12` and internal group gap `10 -> 8`.

## Entry: 2026-02-13 (dashboard style regression fix + guardrail)
- Date: 2026-02-13
- Task: Fix broken dashboard card styles and prevent repeat regressions.
- Decision/Change:
  - Restored design-token CSS variables in `web/app/globals.css` that are required by shared primitives and dashboard cards:
    - `--surface-card-default`, `--surface-card-muted`, `--border-default`, `--text-primary`, `--text-secondary`, `--interactive-primary`, `--feedback-danger`, `--radius-sm`, `--space-3`, `--shadow-raised`, and related primitive/semantic tokens.
  - Added style contract checker:
    - `web/scripts/verify-style-contract.mjs` validates required token presence in `app/globals.css`.
  - Integrated guard into developer workflow:
    - `web/package.json`: `lint` now runs `verify:styles` before ESLint.
  - Integrated guard into CI:
    - `.github/workflows/ci.yml` web job now runs `npm run lint` (includes style contract check).
- Why:
  - Dashboard and shared cards lost styles after global token removal in `globals.css`.
  - Needed an automated failure mode for future token regressions.
- Validation:
  - `cd web && npm run verify:styles` -> passed.
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with warnings only (0 errors).
- Files touched:
  - `web/app/globals.css`
  - `web/scripts/verify-style-contract.mjs`
  - `web/package.json`
  - `.github/workflows/ci.yml`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation v2 app/media UX flow refinement)
- Date: 2026-02-13
- Task: Align app/media panel and modal UX with the new flow (apps -> versions -> screens, create/edit split).
- Decision/Change:
  - Rewired `SimulationEditor` to grouped app model (`application -> versions -> screens`) compatible with the new `AppMediaTab` contract.
  - Implemented create/edit modal modes:
    - `+` opens empty form with hints and no preloaded media.
    - App edit icon opens prefilled form for selected app/version.
  - Kept package identifier internal only; removed package-focused validation copy from modal UX.
  - Added version-level expand/load behavior and persisted local state updates after media upload.
  - Updated app list behavior to support per-version screen loading and drag/add actions.
- Why:
  - User reported confusing UX and requested explicit create/edit behavior, app list restructuring, and removal of package-name exposure.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `web/src/features/simulation/ui/editor/panels/AppMediaTab.tsx`
  - `web/src/features/simulation/ui/editor/panels/AppMediaTab.module.css`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation v2 modal polish: plus/store/multi-upload/submit)
- Date: 2026-02-13
- Task: Polish app/media UX in simulation v2 editor per product feedback.
- Decision/Change:
  - Fixed `+` control alignment in Applications panel (icon centered in circular button).
  - Added store-based fallback icon in app cards when app icon is absent.
  - Enabled batch image upload in app modal (`multiple` file input with sequential upload processing).
  - Added explicit modal submit action:
    - `Добавить приложение` in create mode,
    - `Сохранить приложение` in edit mode.
  - Relaxed create-mode media binding defaults:
    - empty min/max version fields now fallback to `1.0.0` / `99.99.99`,
    - validation focuses on app name + valid explicit version/date formats.
- Why:
  - User reported misaligned add icon, inactive media upload flow, missing store visual cue, and absence of final modal action.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/panels/AppMediaTab.tsx`
  - `web/src/features/simulation/ui/editor/panels/AppMediaTab.module.css`
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation v2 modal: rename/delete media screens)
- Date: 2026-02-13
- Task: Replace modal-level "add screen" actions with media management actions for app screens.
- Decision/Change:
  - Added backend media-asset management endpoints in simulation module:
    - `PATCH /simulation/media/{asset_id}` to rename `original_filename`.
    - `DELETE /simulation/media/{asset_id}` to remove asset and storage file.
  - Added web-admin proxy route for media asset operations:
    - `web/app/api/admin/simulation/media/[assetId]/route.ts` with PATCH/DELETE passthrough.
  - Extended frontend simulation client with:
    - `renameSimulationMediaAssetRemote()`
    - `deleteSimulationMediaAssetRemote()`
  - Updated simulation v2 app/media modal UI:
    - removed modal button `Добавить` per screen,
    - added inline editable screen title input (rename on blur/Enter),
    - added `Удалить экран` action.
  - Synced renamed/deleted media across modal state and app/version screen lists in editor state.
- Why:
  - User requested explicit management of already added screens in modal (rename/delete) instead of adding to canvas from that window.
- Validation:
  - `python3 -m ruff check` on changed backend simulation files -> passed.
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with warnings only (0 errors).
- Files touched:
  - `backend/app/modules/simulation/api/router.py`
  - `backend/app/modules/simulation/api/schemas.py`
  - `backend/app/modules/simulation/domain/services.py`
  - `backend/app/modules/simulation/infra/repository.py`
  - `web/app/api/admin/simulation/media/[assetId]/route.ts`
  - `web/src/features/simulation/api/client.ts`
  - `web/src/features/simulation/ui/editor/panels/AppMediaTab.tsx`
  - `web/src/features/simulation/ui/editor/panels/AppMediaTab.module.css`
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation v2: hotspot drag-to-screen connection fix)
- Date: 2026-02-13
- Task: Fix inability to attach drawn hotspot zone to target screen by drag line in simulation v2 editor.
- Decision/Change:
  - Hardened drop target detection in `findNodeIdAtPoint()`:
    - first pass via `document.elementsFromPoint()` + closest ReactFlow node,
    - fallback pass via bounding boxes with 8px tolerance.
  - Stabilized hotspot drag pointer lifecycle in `SimulationEditor`:
    - switched pointer listeners to capture phase,
    - stopped re-registering listeners on every pointer move (dependency by active drag flag),
    - synchronized drag coordinates in ref/state and centralized drag finalization.
  - Improved pointer reliability in hotspot interaction:
    - added pointer capture on hotspot `pointerdown`,
    - disabled touch gestures on hotspot (`touch-action: none`).
- Why:
  - User reported drag line from hotspot visually starts but does not connect to destination screen on drop.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `web/src/features/simulation/ui/editor/canvas/ScreenNode.tsx`
  - `web/src/features/simulation/ui/editor/canvas/ScreenNode.module.css`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation v2: hotspot target detection follow-up)
- Date: 2026-02-13
- Task: Follow-up fix after user reported connection drop still not attaching despite pointer events firing.
- Decision/Change:
  - Added flow-space target detection (`findNodeIdAtFlowPoint`) based on `screenToFlowPosition` + node coordinates/dimensions.
  - Kept DOM hit-test as fallback only.
  - Added width/height fallbacks for nodes when measured size is not yet available.
- Why:
  - User confirmed drag line and drop hint appear, meaning pointerup runs but target node was unresolved via DOM-only hit-test.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (codex superpowers skill install)
- Date: 2026-02-13
- Task: Install `obra/superpowers` for Codex using official INSTALL.md steps.
- Decision/Change:
  - Fetched install instructions from:
    - `https://raw.githubusercontent.com/obra/superpowers/refs/heads/main/.codex/INSTALL.md`
  - Cloned repository:
    - `git clone https://github.com/obra/superpowers.git ~/.codex/superpowers`
  - Created skills discovery symlink exactly per guide:
    - `~/.agents/skills/superpowers -> ~/.codex/superpowers/skills`
- Why:
  - User requested to fetch and execute the install guide directly.
- Validation:
  - `readlink ~/.agents/skills/superpowers` resolves to `/Users/npopov/.codex/superpowers/skills`.
  - `ls -la ~/.agents/skills` shows active `superpowers` symlink.
- Files touched:
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (agents home sync from ~/dev/ai)
- Date: 2026-02-13
- Task: Mirror local AI tooling directory into `~/.agents` per user request.
- Decision/Change:
  - Performed safe preview:
    - `rsync -avhn --stats ~/dev/ai/ ~/.agents/`
  - Executed sync without delete:
    - `rsync -avh ~/dev/ai/ ~/.agents/`
  - Verified that existing superpowers link remains valid:
    - `~/.agents/skills/superpowers -> ~/.codex/superpowers/skills`
- Why:
  - User requested to transfer all content from `~/dev/ai/` into `~/.agents/`.
- Validation:
  - `ls -la ~/.agents` shows copied `README.md`, `init-project.sh`, `mcp`, `skills`, `templates`.
  - `readlink ~/.agents/skills/superpowers` resolves correctly.
- Files touched:
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation v2: hotspot drop targeting via ReactFlow intersections)
- Date: 2026-02-13
- Task: Third-stage fix for hotspot drag connection still failing on neighbor screen drop.
- Decision/Change:
  - Switched primary drop target resolution to ReactFlow internal geometry API `getIntersectingNodes()` with a 24px hitbox around drop point.
  - Added closest-candidate resolver for overlapping candidates.
  - Kept flow-space and DOM strategies as fallback chain.
- Why:
  - User confirmed drag line appears and pointerup flow executes, which indicates weak node hit detection rather than drag lifecycle failure.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation v2: hotspot properties priority and selection sync)
- Date: 2026-02-13
- Task: Apply approved hybrid design (Phase 1): hotspot properties must open in right panel on hotspot click.
- Decision/Change:
  - Applied panel priority rule `hotspot > screen` without full state-model refactor.
  - Introduced `selectedNodeForProperties` so screen panel is hidden when a hotspot is selected.
  - Synced selection during hotspot interaction:
    - on hotspot drag start: keep source node selected,
    - on hotspot click and drag-drop success: keep source node + hotspot selected.
  - Added design document for approved approach:
    - `docs/plans/2026-02-13-hotspot-properties-priority-design.md`.
- Why:
  - User could create hotspot but could not access hotspot properties in right panel, which blocked target setup/verification.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `docs/plans/2026-02-13-hotspot-properties-priority-design.md`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation v2: remove click hint popup and stabilize hotspot drag line)
- Date: 2026-02-13
- Task: Apply UX correction requested by user: no popup on hotspot click; rely on right properties panel, and ensure drag line renders reliably.
- Decision/Change:
  - Removed inline click popup flow for hotspot hint editing from `SimulationEditor`.
  - Hotspot is selected immediately on pointer down (`selectedHotspotId`) so right panel opens consistently.
  - Drag line coordinates now update on every pointer move (without movement threshold gate).
  - Drop/target logic now uses released coordinates persisted into drag state before resolution.
  - Kept screen/pane click behavior for returning to screen/default properties.
  - Removed hotspot pointer-capture call in node component to avoid pointer event routing side-effects.
- Why:
  - User reported right panel not opening on click unless dragging to another screen and drag line not being visible.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `web/src/features/simulation/ui/editor/canvas/ScreenNode.tsx`
  - `docs/plans/2026-02-13-hotspot-properties-priority-design.md`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation v2: persistent hotspot-to-screen connection overlay)
- Date: 2026-02-13
- Task: Keep hotspot-to-screen connection visibly present on canvas after linking.
- Decision/Change:
  - Added persistent connection overlay rendered from `hotspot.targetScreenId` data, independent from ReactFlow `edges` rendering.
  - Connection line is drawn from hotspot center (source screen) to target screen center.
  - Active hotspot connection is highlighted in stronger style.
  - Overlay reprojects using `flowToScreenPosition` and viewport signature updates.
- Why:
  - User requested that zone-screen relation remains visibly present on the screen after connection.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `web/src/features/simulation/ui/editor/SimulationEditor.module.css`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation v2: orthogonal persistent links to target screen edge)
- Date: 2026-02-13
- Task: Adjust persistent hotspot links to connect to target screen edge with right-angle routing.
- Decision/Change:
  - Replaced direct segment rendering with orthogonal SVG path (`M-L-L`) for persistent links.
  - Added target edge anchor calculation (`left/right/top/bottom`) based on source hotspot position.
  - Final segment now enters target screen orthogonally and ends on its border.
  - Added target endpoint marker for clearer attachment point.
- Why:
  - User requested connections to attach to screen edge and use right-angle geometry.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `web/src/features/simulation/ui/editor/SimulationEditor.module.css`
  - `.context/operations/work_log.md`
- Follow-up уточнение по визуалу: конечная точка ортогональной связи теперь ведется в центр целевого экрана (а не к краю на горизонтали source).

## Entry: 2026-02-13 (simulation v2: selected-only links + toggle + nearest edge midpoint)
- Date: 2026-02-13
- Task: Improve connection readability in simulation canvas by reducing visual noise and anchoring links predictably.
- Decision/Change:
  - Added `showAllConnections` toggle in top-right canvas panel.
  - Default mode now renders persistent links only for the selected hotspot.
  - Added UI action to switch into full-visibility mode (`Показать все связи`).
  - Reworked target anchor logic: connection now attaches to midpoint of the nearest target screen edge (`left/right/top/bottom`).
  - Kept orthogonal path rendering (`M-L-L`) with final segment perpendicular to target edge.
- Why:
  - User requested clearer UX: avoid clutter by default and keep connection endpoint explicit/consistent.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `web/src/features/simulation/ui/editor/SimulationEditor.module.css`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation v2: figma-like bezier links for hotspot connections)
- Date: 2026-02-13
- Task: Remove visually heavy orthogonal links and switch to Figma-like prototype connection rendering.
- Decision/Change:
  - Replaced orthogonal `M-L-L` persistent link paths with smooth cubic bezier (`M-C`).
  - Added source handle-side inference (left/right/top/bottom) based on source-to-target vector.
  - Kept target anchor at midpoint of nearest screen edge and used it as curve endpoint.
  - Built control points from side-based offsets with adaptive distance-based strength for smoother routing.
- Why:
  - User reported current links feel like they run across the entire screen and look heavy.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation v2: soften bezier curves per UX preference)
- Date: 2026-02-13
- Task: Make hotspot connection curves softer (variant 2) to better match Figma-like feel.
- Decision/Change:
  - Increased bezier handle influence via adaptive offset model (distance + axis based).
  - Added helpers `isHorizontalSide` and `computeBezierHandleOffset` for smoother control-point placement.
  - Updated curve builder to use separate source/target offsets instead of a single shared one.
- Why:
  - User selected softer curve style and reported previous links still felt too heavy/long.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation v2: selected screen shows all related links)
- Date: 2026-02-13
- Task: Improve connection visibility when a screen is selected.
- Decision/Change:
  - Updated persistent link visibility filter.
  - If no hotspot is selected and no global mode is enabled, selecting a screen now shows all related links for that screen (outgoing + incoming).
  - Active styling now highlights those related links when a screen is selected.
- Why:
  - User requested to show all available links after selecting a window.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (auth: resilient session refresh for SSR pages and admin proxies)
- Date: 2026-02-13
- Task: Investigate intermittent forced re-login and implement stable session recovery.
- Root cause evidence:
  - Access cookie (`wa_access_token`) TTL is 30 minutes (`ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 30`).
  - Protected SSR pages redirected directly to `/auth` when access token was missing/expired, without attempting refresh.
  - Admin proxy routes returned 401 on missing/expired access token without transparent refresh retry.
- Decision/Change:
  - Added `/api/admin/auth/refresh` GET flow for browser redirect-based silent refresh (`next` + `lang`), with safe path validation.
  - Kept POST refresh API and improved it to clear auth cookies on 401 refresh failures.
  - Added shared helper for building refresh redirect links (`buildRefreshRedirectHref`).
  - Updated protected pages (`dashboard`, `catalog`, `simulation`, `simulation-v2`) to redirect to refresh endpoint instead of immediate `/auth`.
  - Extended `backend-admin-proxy` with automatic refresh+retry behavior on missing token / backend 401, and cookie rotation propagation in proxy responses.
  - On failed refresh attempts, proxy and refresh route clear auth cookies to avoid stale-loop states.
- Why:
  - Users should not be forced to re-login when only access token expires while refresh token is still valid.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/app/api/admin/auth/refresh/route.ts`
  - `web/src/shared/server/backend-admin-proxy.ts`
  - `web/src/shared/auth/refresh-redirect.ts`
  - `web/app/dashboard/page.tsx`
  - `web/app/catalog/page.tsx`
  - `web/app/simulation/page.tsx`
  - `web/app/simulation-v2/page.tsx`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (auth: avoid refresh race cookie wipe in admin proxy)
- Date: 2026-02-13
- Task: Harden auto-refresh against concurrent request races.
- Decision/Change:
  - Removed cookie-clearing behavior from `backend-admin-proxy` on refresh retry failure.
  - Reason: concurrent requests can rotate refresh token in one response while another still retries with stale token; clearing cookies in the stale branch can wipe a newly valid session.
  - Proxy now only sets rotated cookies on successful refresh and returns 401 otherwise.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/shared/server/backend-admin-proxy.ts`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation: refine hotspot resize guide visibility and corner cues)
- Date: 2026-02-13
- Task: Final polish for hotspot resizing affordances in v2 editor.
- Decision/Change:
  - Resize guide marks are hidden while pointer is on hotspot grip, to avoid visual overlap during move intent.
  - Corner resize marks keep angular shape, with slight radius only in the active corner point.
- Why:
  - Clearer intent separation between move (`grip`) and resize affordances.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/canvas/ScreenNode.tsx`
  - `web/src/features/simulation/ui/editor/canvas/ScreenNode.module.css`

## Entry: 2026-02-13 (simulation: keyboard delete + undo/redo for editor graph)
- Date: 2026-02-13
- Task: Improve keyboard UX in simulation v2 editor.
- Decision/Change:
  - Disabled React Flow default deletion shortcut (`deleteKeyCode={null}`) to avoid deleting a selected screen when a hotspot is selected.
  - Added global keyboard handling (outside input fields and modal):
    - `Delete` / `Backspace`: deletes selected hotspot first; otherwise deletes selected screen.
    - `Ctrl/Cmd+Z`: undo.
    - `Ctrl/Cmd+Shift+Z` and `Ctrl/Cmd+Y`: redo.
  - Implemented lightweight history stack for graph state (`nodes` + `edges`) with capped depth and proper undo/redo transitions.
- Why:
  - Prevent accidental screen deletion and provide expected editor keyboard workflows.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `.context/operations/work_log.md`

## Entry: 2026-02-13 (simulation v2: scenario library binding + canvas import flow)
- Date: 2026-02-13
- Task: Implement UX flow for scenario library as reusable graph blocks tied to app/version.
- Decision/Change:
  - Backend library API now returns scenario binding metadata and graph metrics in summaries:
    - `binding` (`app_package_name`, `store_type`, `min/max_supported_version`, `released_at`, `icon_url`),
    - `screens_count`, `links_count`.
  - Added optional list filters for library summaries by app/version binding (`app_package_name`, `store_type`, `min/max_supported_version`, `released_at`).
  - Web API proxy (`/api/admin/simulation/library`) forwards new filter query params.
  - Simulation editor now supports library scenario insertion into current canvas:
    - by button from library panel,
    - by drag-and-drop scenario card onto canvas.
  - Import logic includes:
    - remap of screen/hotspot/edge IDs,
    - unique title/key conflict resolution via auto-suffix,
    - smart placement: below lowest existing node for button insert; drop point for DnD,
    - anti-overlap vertical shifting on collisions.
  - Library tab UX redesigned:
    - quick list filtered by current app/version binding,
    - modal “Все сценарии” with global list/search,
    - actions `Сохранить весь холст` and `Сохранить выделенное`.
  - Saving “selected” uses selected canvas nodes (fallback to current selected node), keeps only internal links in exported scenario.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
  - `cd backend && ruff check app/modules/simulation/api/router.py app/modules/simulation/api/schemas.py app/modules/simulation/domain/services.py tests/test_simulation_schemas.py` -> passed.
  - `cd backend && PYTHONPATH=. pytest tests/test_simulation_schemas.py` -> passed (5 tests).
  - `cd backend && PYTHONPATH=. pytest tests/test_simulation_service.py tests/test_simulation_schemas.py` -> failed due existing `tests/test_simulation_service.py` fixture wiring issue (service repo is not mocked in current test design); not introduced in this task.
- Files touched:
  - `backend/app/modules/simulation/api/router.py`
  - `backend/app/modules/simulation/api/schemas.py`
  - `backend/app/modules/simulation/domain/services.py`
  - `backend/tests/test_simulation_schemas.py`
  - `web/app/api/admin/simulation/library/route.ts`
  - `web/src/features/simulation/api/client.ts`
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `web/src/features/simulation/ui/editor/panels/LibraryTab.tsx`
  - `web/src/features/simulation/ui/editor/panels/LibraryTab.module.css`

## Entry: 2026-02-14 (simulation v2: prevent awkward text wrapping in side tabs/library actions)
- Date: 2026-02-14
- Task: Improve readability of narrow sidebar labels and action buttons in Simulation v2 editor.
- Decision/Change:
  - Updated top tab labels to shorter, clearer names (`Приложения`, `Редактор`, `Библиотека`) and added tooltip titles.
  - Disabled hard word breaking in tab buttons (`white-space: nowrap`, `text-overflow: ellipsis`) to avoid broken words like `Приложен / ие`.
  - Library action buttons now render with single-line text and ellipsis instead of uncontrolled multiline breaks.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/panels/ToolsPanel.tsx`
  - `web/src/features/simulation/ui/editor/panels/ToolsPanel.module.css`
  - `web/src/features/simulation/ui/editor/panels/LibraryTab.tsx`
  - `web/src/features/simulation/ui/editor/panels/LibraryTab.module.css`

## Entry: 2026-02-14 (simulation v2: tab icons + clearer tooltips + library search row split)
- Date: 2026-02-14
- Task: Improve sidebar readability and discoverability for tabs/library controls.
- Decision/Change:
  - Added compact inline SVG icons to top tabs and descriptive hover tooltips.
  - Tabs now use icon + short label with ellipsis behavior in narrow width.
  - In scenario library panel, moved search input to its own dedicated row.
  - Removed global mismatch banner text (`Текущая привязка редактора отличается...`) from panel body to reduce noise; mismatch remains visible per-card as short warning tag (`Другая версия`).
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/panels/ToolsPanel.tsx`
  - `web/src/features/simulation/ui/editor/panels/ToolsPanel.module.css`
  - `web/src/features/simulation/ui/editor/panels/LibraryTab.tsx`
  - `web/src/features/simulation/ui/editor/panels/LibraryTab.module.css`

## Entry: 2026-02-13 (simulation v2: preview polish + full image in properties)
- Date: 2026-02-13
- Task: Fix screen preview UX and image rendering in right-side properties panel.
- Decision/Change:
  - Fullscreen preview overlay now uses background blur so canvas stays visible but de-emphasized.
  - Preview dialog sizing switched from fixed-width layout to content-fit behavior:
    - image remains centered,
    - dialog adapts to screenshot dimensions within viewport limits.
  - Replaced text close symbol (`×`) with stable SVG icon to avoid skewed rendering across fonts/devices.
  - In properties panel, selected screen preview now shows the full image (`object-fit: contain`) instead of cropped zoom.
  - In image selection grid, thumbnails also use contain-fit to avoid aggressive crop of portrait screenshots.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `web/src/features/simulation/ui/editor/SimulationEditor.module.css`
  - `.context/operations/work_log.md`

## Entry: 2026-02-14 (simulation v2: hotspot link drag cleanup + stale line fixes)
- Date: 2026-02-14
- Task: Fix visual bugs where hotspot link lines could remain/stick after drag interactions.
- Decision/Change:
  - Refactored hotspot link drag lifecycle for stable cleanup:
    - pointer listeners are now always attached and react to active drag ref,
    - added cleanup on `pointercancel`, window `blur`, and document `visibilitychange`.
  - Added explicit drag state reset when media modal or image preview opens, so transient lines/hints cannot remain visible in overlays.
  - Updated link reassignment behavior:
    - dropping on another screen rebinds the hotspot link,
    - dropping outside any screen now removes existing link for that hotspot (with short hint).
  - Edge model is kept in sync by replacing edge(s) for the dragged hotspot instead of accumulating stale transitions.
  - During drag, the persistent line for that same hotspot is temporarily hidden to avoid duplicate/ghost visual overlap.
  - Persistent/drag lines and drop hint are now suppressed while fullscreen image preview is open.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `.context/operations/work_log.md`

## Entry: 2026-02-14 (simulation v2: prevent stale drag line during panel resize)
- Date: 2026-02-14
- Task: Fix remaining case where temporary hotspot drag line could stay visible while resizing left/right side panels.
- Decision/Change:
  - Added centralized transient link cleanup (`clearTransientLinkVisuals`) that clears active hotspot drag line + drop hint.
  - Cleanup is now triggered explicitly on sidebar/properties resize start and while resize mode is active.
  - Restored persistent connection rendering behind preview overlay (connection no longer hidden when preview is open).
  - Persistent connection path recomputation now also accounts for side panel width/resizing state, so screen-space anchors update immediately while resizing panels.
  - Added `ResizeObserver`-driven canvas layout tick so connection anchors are recomputed after real DOM geometry changes, preventing stale line positions after fast panel resize interactions.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing warnings only (0 errors).
- Files touched:
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
  - `.context/operations/work_log.md`

## Entry: 2026-02-15 (mobile: safe refactor cleanup for DI/snackbar/network dead code)
- Date: 2026-02-15
- Task: Reduce duplication/risk in mobile KMP layer without changing business behavior.
- Decision/Change:
  - Removed duplicate Koin feature module registration in `mobile/shared/.../KoinBootstrap.kt`.
    - Canonical module assembly remains in `createMobileAppModule()` (`AppModule.kt`).
  - Hardened `HomeRoute` snackbar helper:
    - `showAndDismissIfNeeded()` now calls dismiss in `finally`, so transient coroutine cancellation does not leave stale error state.
  - Removed dead private network code:
    - `LogoutResponse` in `KtorAuthNetworkDataSource.kt`.
    - `PAYLOAD_PREVIEW_LIMIT` companion constant in `KtorCatalogNetworkDataSource.kt`.
- Validation:
  - Refactor-only code inspection; no logic-path changes introduced.
  - (Optional follow-up) run `cd mobile && ./gradlew test` for full verification.
- Files touched:
  - `mobile/shared/src/commonMain/kotlin/com/digitaledu/shared/di/KoinBootstrap.kt`
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/HomeRoute.kt`
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/ktor/KtorAuthNetworkDataSource.kt`
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/ktor/KtorCatalogNetworkDataSource.kt`
  - `.context/operations/work_log.md`

## Entry: 2026-02-15 (mobile: import normalization, no FQCN in code body)
- Date: 2026-02-15
- Task: Enforce style rule — imports only at file top; avoid fully-qualified library calls inside Kotlin code body.
- Decision/Change:
  - Replaced inline `kotlinx.coroutines.flow.*` type usages with top-level imports (`Flow`, `MutableStateFlow`) in:
    - `mobile/androidApp/.../SecureAuthSessionStore.kt`
    - `mobile/core/data/.../NetworkAuthRepository.kt`
  - Replaced fully-qualified Compose calls with imports:
    - `androidx.compose.material3.Icon` + `androidx.compose.material.icons.Icons` in `VideoStory.kt`
    - `androidx.compose.material3.ripple` in `SimulationScreen.kt`
  - Performed regex scan over `mobile/**/*.kt` to ensure no remaining fully-qualified calls in code bodies for common package prefixes (`androidx`, `kotlinx`, `io.ktor`, `org.koin`, `com`).
- Validation:
  - Static grep check passed (no matches after refactor).
- Files touched:
  - `mobile/androidApp/src/main/kotlin/com/digitaledu/mobile/auth/SecureAuthSessionStore.kt`
  - `mobile/core/data/src/commonMain/kotlin/com/digitaledu/core/data/auth/NetworkAuthRepository.kt`
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/ui/player/components/VideoStory.kt`
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/ui/player/SimulationScreen.kt`
  - `.context/operations/work_log.md`
- Follow-up validation note:
  - Initial `./gradlew test` run failed with `Unresolved reference 'PlayArrow'` in `VideoStory.kt` after import normalization.
  - Fixed by adding `import androidx.compose.material.icons.filled.PlayArrow` while keeping code free of fully-qualified calls.
- Follow-up validation note (retry):
  - Re-ran `cd mobile && ./gradlew test` after fixing `PlayArrow` import.
  - Compilation progressed further; previous unresolved import error is resolved.
  - Build now fails at dependency resolution due to network/DNS access to repositories (`dl.google.com`, `repo.maven.apache.org`), not due to Kotlin code errors in the refactor.

## Entry: 2026-02-15 (mobile: consolidate duplicated Ktor executeCall)
- Date: 2026-02-15
- Task: Continue mobile refactor by removing duplicated network call error-wrapping logic.
- Decision/Change:
  - Added shared helper `KtorCallExecutor.kt` in `core/network/ktor` with package-level `executeCall`.
  - Removed duplicated private `executeCall` implementations from:
    - `KtorAuthNetworkDataSource.kt`
    - `KtorCatalogNetworkDataSource.kt`
  - Kept behavior identical (same exception classes mapped to same `NetworkException` messages/status/cause).
  - Performed small import cleanup in catalog/auth files (removed now-unused imports).
- Validation:
  - Structural check via ripgrep confirms single canonical `executeCall` definition and usage from both data sources.
  - Full Gradle test run remains environment-dependent due external dependency repository access.
- Files touched:
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/ktor/KtorCallExecutor.kt`
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/ktor/KtorAuthNetworkDataSource.kt`
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/ktor/KtorCatalogNetworkDataSource.kt`
  - `.context/operations/work_log.md`
- Follow-up style cleanup:
  - Verified all Kotlin source files in `mobile/**` (excluding build/.gradle caches) for import placement.
  - Fixed `ScreenPayload.kt` where KDoc was placed before imports; imports are now directly below `package` declaration.
  - Re-ran scoped checks: no misplaced imports and no fully-qualified library calls in Kotlin code bodies.

## Entry: 2026-02-15 (mobile: next refactor wave in network mapping/request helpers)
- Date: 2026-02-15
- Task: Continue safe refactoring in mobile network layer to reduce local duplication.
- Decision/Change:
  - In `KtorAuthNetworkDataSource`, introduced private `postJson<T>(path, payload)` helper for repeated JSON POST + decode flow.
    - Applied to OTP request/verify, login, refresh.
    - Kept `logout` explicit POST without response body decoding to preserve previous behavior.
  - In `KtorCatalogNetworkDataSource`, extracted pure mapping helpers:
    - `CourseResponse.toCatalogCourse()`
    - `ReleaseResponse.toCatalogRelease()`
    - `ScreenResponse.toCatalogScreen()`
    - Updated call sites to use these mappers, reducing inline mapping noise.
  - All changes are structural/refactoring only; response contracts and mapping outputs unchanged.
- Validation:
  - Local static inspection of resulting diffs; no business-logic branch changes.
- Files touched:
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/ktor/KtorAuthNetworkDataSource.kt`
  - `mobile/core/network/src/commonMain/kotlin/com/digitaledu/core/network/ktor/KtorCatalogNetworkDataSource.kt`
  - `.context/operations/work_log.md`

## Entry: 2026-02-15 (mobile: PlayerViewModel safe dedup refactor)
- Date: 2026-02-15
- Task: Continue refactoring `PlayerViewModel` to reduce repeated state transition code.
- Decision/Change:
  - Replaced repeated `persistCurrentProgress()` + `current screen -> loadLessonReference` sequences with shared helper `refreshProgressAndReference()`.
  - Consolidated repeated completed-screens update logic into `markCompletedIfMovedForward(sourceIndex, targetIndex, completedScreens)`.
  - Applied helper usage in `goToNextScreen()` and `navigateToScreenKey()`.
  - Kept behavior unchanged (same navigation rules, same side effects after transitions).
- Validation:
  - Static review of diff for behavior parity.
  - Style check rerun: imports are top-only, no fully-qualified library calls in Kotlin code bodies.
- Files touched:
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/player/PlayerViewModel.kt`
  - `.context/operations/work_log.md`

## Entry: 2026-02-15 (mobile: PlayerViewModel reference-loading cleanup)
- Date: 2026-02-15
- Task: Continue safe refactoring in `PlayerViewModel` around lesson reference loading.
- Decision/Change:
  - Refactored `loadLessonReference()` to reduce duplicated null-reset logic.
  - Added `clearActiveLessonReference()` helper and reused it for both "no reference id" and failure path.
  - Added `ScreenPayload.referenceIdOrNull()` helper to centralize extraction of reference id from payload types.
  - Switched internal fetch block to `runCatching().onSuccess/onFailure` for consistency with other ViewModels.
- Validation:
  - Behavior preserved: same fallback to `activeLessonReference = null` when no ref id or fetch failure.
- Files touched:
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/player/PlayerViewModel.kt`
  - `.context/operations/work_log.md`

## Entry: 2026-02-15 (mobile: Catalog/Profile ViewModel flow helper cleanup)
- Date: 2026-02-15
- Task: Continue safe refactoring by reducing repeated loading/submitting flow boilerplate.
- Decision/Change:
  - `CatalogViewModel`:
    - Introduced `runLoadingAction(block)` helper (sets loading, executes, maps failure to `setError`, returns nullable result).
    - Rewrote `loadCourses()` and `openCourse()` to use this helper.
  - `ProfileViewModel`:
    - Introduced `runSubmittingAction(block)` helper (sets submitting, executes, maps failure to `setError`, returns success flag).
    - Rewrote `logout()` to use helper and early-return on failure.
  - No business logic changes; effect/state outcomes remain equivalent.
- Validation:
  - Local static checks: imports top-only and no fully-qualified library calls in Kotlin code bodies.
- Files touched:
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/catalog/CatalogViewModel.kt`
  - `mobile/feature/home/impl/src/commonMain/kotlin/com/digitaledu/feature/home/impl/profile/ProfileViewModel.kt`
  - `.context/operations/work_log.md`

## Entry: 2026-02-22 (architecture: DB models document AS-IS + TO-BE)
- Date: 2026-02-22
- Task: Подготовить единый документ по моделям БД (инфологическая, даталогическая, реляционная) на основе текущей реализации и планов roadmap.
- Decision/Change:
  - Собран фактический AS-IS с проверкой SQLAlchemy моделей и Alembic миграций (`0001..0008`, `9845f9f517a3`).
  - Зафиксирован TO-BE слой для Sprint 2+:
    - RBAC (`roles`, `permissions`, `role_permissions`, `user_roles`),
    - authoring hierarchy (`modules`, `lessons`, `lesson_screens`, `lesson_references`),
    - moderation, groups/assignments/progress, audit, content refresh.
  - Добавлено явное допущение по конфликту требований:
    - editable published vs immutable published.
  - Отмечен техдолг: таблица `lesson_references` создаётся миграцией, но не включена в runtime model registry (`backend/app/models.py`).
- Why:
  - Нужен единый источник истины по текущему и целевому устройству данных перед расширением модуля catalog/authoring/RBAC.
- Files touched:
  - `.context/architecture/database_models.md`
  - `.context/operations/work_log.md`
- Next step:
  - Согласовать открытые вопросы (published policy, single-role vs multi-role, source of truth для lesson screens) и на их основе подготовить миграционный план Sprint 2/3.

## Entry: 2026-02-22 (docs: RU infological model copy-friendly)
- Date: 2026-02-22
- Task: Подготовить русскоязычную инфологическую модель в удобном для копирования формате.
- Decision/Change:
  - Добавлен отдельный документ с инфологической моделью конечного продукта:
    - текстовая модель (сущности/кардинальности),
    - Mermaid-диаграмма на русском,
    - примечание по RBAC (MVP single-role vs target multi-role).
- Why:
  - Пользователю нужна русская версия, которую можно легко копировать в внешние инструменты (mermaid.live/diagrams.net/ВКР).
- Files touched:
  - `docs/db-diagrams/infological_model_ru.md`
  - `.context/operations/work_log.md`
- Next step:
  - Подготовить аналогичные RU-файлы для даталогической и реляционной моделей в том же формате.

## Entry: 2026-02-22 (docs: final-product DB schemes incl. cybersecurity trainer)
- Date: 2026-02-22
- Task: Подготовить полный набор схем БД для конечного продукта (весь запланированный функционал), включая уроки цифровой безопасности с симуляцией мошеннических схем.
- Decision/Change:
  - Добавлен отдельный пакет схем `docs/db-diagrams/final-product/`:
    - русская инфологическая модель (копируемая),
    - даталогическая модель по доменам,
    - 3 реляционные схемы (core, cybersecurity, platform services).
  - В модель включены Phase 2 контуры:
    - analytics,
    - AI summaries/recommendations,
    - voice/TTS/glossary,
    - SOS notifications,
    - offline sync.
  - Для кибербезопасности добавлен выделенный домен:
    - `fraud_scenarios`, `fraud_patterns`, ветвящийся диалог, risk signals, outcomes, user attempts.
- Why:
  - Нужны визуальные и копируемые схемы для ВКР и проектирования целевой архитектуры данных под полный roadmap.
- Files touched:
  - `docs/db-diagrams/final-product/README.md`
  - `docs/db-diagrams/final-product/01_infological_ru.md`
  - `docs/db-diagrams/final-product/02_datalogical_ru.md`
  - `docs/db-diagrams/final-product/03_relational_core.mmd`
  - `docs/db-diagrams/final-product/04_relational_cybersecurity.mmd`
  - `docs/db-diagrams/final-product/05_relational_services.mmd`
  - `.context/operations/work_log.md`
- Next step:
  - Согласовать окончательные статусы бизнес-политик (editable/immutable published, single-role/multi-role) и отразить это в миграционном плане TO-BE.

## Entry: 2026-02-22 (docs: unified relational schema)
- Date: 2026-02-22
- Task: Свести реляционную модель в одну общую диаграмму (вместо раздельных частей).
- Decision/Change:
  - Добавлен единый файл реляционной модели:
    - `docs/db-diagrams/final-product/03_relational_full.mmd`
  - README обновлён: unified схема помечена как основная, раздельные схемы оставлены как опциональная декомпозиция.
- Why:
  - Пользователь запросил одну общую реляционную схему для конечного продукта.
- Files touched:
  - `docs/db-diagrams/final-product/03_relational_full.mmd`
  - `docs/db-diagrams/final-product/README.md`
  - `.context/operations/work_log.md`
- Next step:
  - При необходимости подготовить укрупнённую «версию для защиты» (с меньшим числом атрибутов для лучшей читаемости на слайде/листе А4).

## Entry: 2026-02-22 (docs: infological AS-IS aligned with current implementation)
- Date: 2026-02-22
- Task: Перевести инфологическую модель в формат «как сейчас реализовано» (AS-IS).
- Decision/Change:
  - Обновлён файл:
    - `docs/db-diagrams/infological_model_ru.md`
  - Удалены TO-BE сущности (RBAC tables, modules/lessons/groups/assignments/audit/pipeline и др.).
  - Оставлены только текущие рабочие контуры:
    - users/auth (OTP, QR, sessions),
    - catalog releases,
    - simulation drafts/media/library.
  - Добавлена пометка о техдолге `lesson_references` (миграция есть, runtime registry не подключён).
- Why:
  - Пользователь запросил инфологическую схему именно в виде текущего состояния проекта.
- Files touched:
  - `docs/db-diagrams/infological_model_ru.md`
  - `.context/operations/work_log.md`
- Next step:
  - При необходимости сделать вторую соседнюю версию `TO-BE` в том же стиле для сравнения “было/станет”.

## Entry: 2026-02-22 (docs: infological TO-BE companion)
- Date: 2026-02-22
- Task: Добавить отдельную инфологическую схему TO-BE рядом с AS-IS.
- Decision/Change:
  - Создан файл:
    - `docs/db-diagrams/infological_model_to_be_ru.md`
  - Включены целевые контуры конечного продукта:
    - RBAC,
    - authoring hierarchy,
    - moderation,
    - groups/assignments/progress/favorites,
    - cybersecurity trainer,
    - simulation refresh,
    - analytics/AI/SOS/voice/offline sync.
- Why:
  - Нужна пара сопоставимых схем “как сейчас” и “как будет” для проектной и ВКР документации.
- Files touched:
  - `docs/db-diagrams/infological_model_to_be_ru.md`
  - `.context/operations/work_log.md`
- Next step:
  - При необходимости добавить в этот файл секцию “границы MVP vs Phase 2” с цветовой маркировкой.

## Entry: 2026-02-22 (docs/tooling: удобная итерация по Mermaid схемам)
- Date: 2026-02-22
- Task: Подготовить удобный workflow для постоянной доработки схем.
- Decision/Change:
  - Добавлен рендер-скрипт:
    - `scripts/render-diagrams.sh`
  - Добавлены Make targets:
    - `make diagrams` — рендер всех `*.mmd` из `docs/db-diagrams/final-product/` в `rendered/*.svg`
    - `make diagrams-clean` — очистка каталога render.
  - Инфологическая и даталогическая схемы продублированы в чистом формате Mermaid:
    - `docs/db-diagrams/final-product/01_infological_ru.mmd`
    - `docs/db-diagrams/final-product/02_datalogical_ru.mmd`
  - README обновлён с командами рендера и fallback-режимом (`MERMAID_ALLOW_NPX=1`).
- Validation:
  - `make diagrams` выполняется и корректно сообщает об отсутствии `mmdc` в окружении.
  - В текущей среде автозагрузка через `npx` недоступна из-за DNS/network ограничений (`ENOTFOUND registry.npmjs.org`).
- Files touched:
  - `scripts/render-diagrams.sh`
  - `Makefile`
  - `docs/db-diagrams/final-product/README.md`
  - `docs/db-diagrams/final-product/01_infological_ru.mmd`
  - `docs/db-diagrams/final-product/02_datalogical_ru.mmd`
  - `.context/operations/work_log.md`
- Next step:
  - Установить `@mermaid-js/mermaid-cli` локально в рабочем окружении или продолжить редактирование/экспорт через mermaid.live.

## Entry: 2026-02-22 (docs: infological model in Chen notation)
- Date: 2026-02-22
- Task: Подготовить инфологическую схему в нотации Чена с явными узлами-связями и кардинальностями.
- Decision/Change:
  - Добавлен файл:
    - `docs/db-diagrams/final-product/01_infological_chen_ru.mmd`
  - Формат:
    - сущности как отдельные узлы,
    - отношения как отдельные узлы-ромбы (в Mermaid через `{...}`),
    - кардинальности на рёбрах (`1`, `N`, `M`).
  - README обновлён ссылкой на Chen-вариант.
- Why:
  - Пользователю нужна именно инфологическая схема в стиле Чена для проектной/ВКР подачи.
- Files touched:
  - `docs/db-diagrams/final-product/01_infological_chen_ru.mmd`
  - `docs/db-diagrams/final-product/README.md`
  - `.context/operations/work_log.md`
- Next step:
  - При необходимости сделать "короткую Chen-версию для печати на 1 лист А4" (с укрупнением доменов).

- 2026-02-22: Уплотнена инфологическая диаграмма Чена (`docs/db-diagrams/final-product/01_infological_chen_ru.mmd`): добавлен compact init (node/rank spacing), переведена в `flowchart LR` с `direction TB` в подсхемах, сокращены/перенесены длинные подписи для минимальной занимаемой площади.

- 2026-02-22: В инфологической модели Чена уточнены подписи кодов по сущностям (например, `код пользователя`, `код сценария`, `код инцидента`) вместо общего `код`.

- 2026-02-22: Составлен текстовый реестр сущностей и атрибутов конечного продукта по фичам: `docs/db-diagrams/final-product/00_entities_attributes_ru.md`.

- 2026-02-22: По требованию исключена phone-based auth из моделей: удалены `хеш телефона` и сущность/таблица OTP (`otp_challenges`) из инфологической, даталогической и реляционных схем (`01_infological_chen_ru*.mmd`, `00_entities_attributes_ru.md`, `02_datalogical_ru.*`, `03_relational_{core,full}.mmd`).

- 2026-02-22: Проведена валидация сущностей даталогической модели против общей реляционной схемы (56/56). Добавлена пропущенная `fraud_hints`. Отчёт: `docs/db-diagrams/final-product/06_datalogical_validation_ru.md`.

- 2026-02-22: Сформирован полный реестр даталогической модели (сущности + атрибуты из общей реляционной схемы): `docs/db-diagrams/final-product/07_datalogical_entities_attributes_ru.md`.

- 2026-02-22: Перерисована даталогическая схема в более презентабельном стиле (цветовые домены, междоменные зависимости, компактные карточки сущностей): `02_datalogical_ru.mmd`; сохранён бэкап старой версии `02_datalogical_ru_simple.mmd`; синхронизирован Mermaid-блок в `02_datalogical_ru.md`.

## Entry: 2026-02-25 (web runtime audit fixes: simulation responsive + a11y + fetch dedupe)
- Date: 2026-02-25
- Task: Внедрить быстрые исправления по итогам runtime-аудита веба: адаптивность `simulation-v2`, доступность hotspot/image controls, уменьшение повторных GET при mount в dev.
- Decision/Change:
  - `web/src/features/simulation/ui/editor/SimulationEditor.module.css`:
    - добавлены responsive breakpoints (`<=1024`, `<=640`) с перестройкой layout в колонку;
    - canvas получает приоритет и минимальную высоту на узких экранах;
    - скрыты resize handles на мобильных;
    - toolbar/buttons переведены в wrap-режим для narrow viewport.
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`:
    - image preview trigger заменен с `img role=button` на нативную кнопку с `aria-label`;
    - hotspot list переведен с `li onClick` на `button` + `aria-pressed`.
  - `web/src/features/simulation/api/client.ts`:
    - добавлена in-flight dedupe карта для GET;
    - добавлен short-lived response dedupe (`dedupeMs`) для наиболее шумных запросов `drafts/current` и `media/apps`.
  - `web/next.config.mjs`:
    - отключены `devIndicators` для более чистого keyboard tab-path в dev.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with existing repo warnings (`no-img-element`, unused vars в архивных файлах).
  - Playwright smoke re-run:
    - login + navigation до `simulation-v2` проходит;
    - мобильный layout `simulation-v2` больше не блокируется боковыми панелями (canvas доступен на 320px).
- Next step:
  - При необходимости: заменить ключевые `img` на `next/image` и добавить targeted Playwright assertions для keyboard flow и network dedupe.

## Entry: 2026-02-25 (web runtime hardening follow-up: image optimization + assertion script)
- Date: 2026-02-25
- Task: Продолжить улучшения после аудита: снизить `no-img-element` в active editor scope и добавить воспроизводимые runtime-assertions.
- Decision/Change:
  - Переведены изображения в active simulation editor scope на `next/image` (с `unoptimized` для dynamic/media URLs):
    - `web/src/features/simulation/ui/editor/SimulationEditor.tsx`
    - `web/src/features/simulation/ui/editor/canvas/ScreenNode.tsx`
    - `web/src/features/simulation/ui/editor/panels/{AppMediaTab,AppScreensTab,LibraryTab,MediaTab}.tsx`
  - Обновлены соответствующие CSS-модули под новые image-классы.
  - Добавлен runtime regression script:
    - `web/scripts/test-simulation-runtime.cjs`
    - проверяет login, keyboard tab-sequence на dashboard и mobile layout инварианты для `simulation-v2`.
  - Добавлен npm script:
    - `web/package.json` -> `test:simulation-runtime`.
- Validation:
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with pre-existing repo warnings in archived builders and legacy test script.
  - `cd web && npm run test:simulation-runtime` -> passed.
- Next step:
  - Перенести оставшиеся `img` из архивных/legacy simulation builder файлов в отдельный cleanup-chore (вне текущего активного editor scope).

## Entry: 2026-02-25 (web auth/bff security hardening: cookie-only session)
- Date: 2026-02-25
- Task: Закрыть security-risk по service-token fallback и исключить возврат сырого auth token payload в web BFF ответах.
- Decision/Change:
  - Удален `WEB_ADMIN_ACCESS_TOKEN` fallback из user-facing страниц и BFF proxy:
    - `web/app/dashboard/page.tsx`
    - `web/app/catalog/page.tsx`
    - `web/app/simulation-v2/page.tsx`
    - `web/src/shared/server/backend-admin-proxy.ts`
  - Удален `WEB_ADMIN_ACCESS_TOKEN` fallback из simulation media BFF routes:
    - `web/app/api/admin/simulation/media/route.ts`
    - `web/app/api/admin/simulation/media/apps/route.ts`
    - `web/app/api/admin/simulation/media/[assetId]/route.ts`
    - `web/app/api/admin/simulation/media/[assetId]/file/route.ts`
  - Санитизированы успешные auth responses в BFF (login/otp verify/refresh):
    - вместо возврата `access_token`/`refresh_token` наружу endpoint возвращает только `{ status: "ok" }`, при этом cookie rotation сохраняется.
    - файлы: `web/app/api/admin/auth/{login,otp/verify,refresh}/route.ts`.
  - Добавлен regression script для security-invariants:
    - `web/scripts/test-auth-hardening.cjs`
    - проверяет отсутствие `WEB_ADMIN_ACCESS_TOKEN` fallback в критичных файлах и отсутствие raw tokens в JSON-ответах `login`/`refresh`.
  - Обновлен npm scripts:
    - `web/package.json` -> `test:auth-hardening`.
- Validation:
  - `cd web && npm run test:auth-hardening` -> passed.
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run lint` -> passed with pre-existing warnings in archived/legacy files.
  - `cd web && npm run test:simulation-runtime` -> passed.
- Next step:
  - При необходимости добавить `test:auth-hardening` в CI как blocking smoke для web security contracts.

## Entry: 2026-02-25 (legacy cleanup + lint noise removal)
- Date: 2026-02-25
- Task: Убрать legacy-артефакты simulation builder из active source tree и довести web lint до clean state без предупреждений.
- Decision/Change:
  - Удалены неиспользуемые legacy файлы builder (`archived/restored/legacy`):
    - `web/src/features/simulation/ui/simulation-builder.archived.tsx`
    - `web/src/features/simulation/ui/simulation-builder.restored.tsx`
    - `web/src/features/simulation/ui/simulation-builder.tsx`
    - `web/src/features/simulation/ui/simulation-builder.module.css`
  - Устранен remaining lint warning в диагностическом скрипте:
    - `web/test-connection.cjs` (удален неиспользуемый параметр).
- Validation:
  - `cd web && npm run lint` -> passed clean (no warnings/errors).
  - runtime smoke scripts по-прежнему green:
    - `npm run test:auth-hardening`
    - `npm run test:simulation-runtime`
- Next step:
  - При необходимости вынести legacy builder snapshots в отдельную docs/archive папку вне lint scope, если нужен исторический референс.

## Entry: 2026-02-25 (web runtime UX audit with Playwright)
- Date: 2026-02-25
- Task: Провести runtime-аудит web-admin (реальный фронтенд `web`) по UX/a11y/responsive/performance сигналам на ключевых флоу.
- Decision/Change:
  - Выполнен e2e walkthrough: `auth -> dashboard -> catalog -> simulation-v2` в локальной среде.
  - Зафиксированы runtime-артефакты:
    - snapshots: `dashboard-snapshot.md`, `catalog-snapshot.md`, `simulation-snapshot.md`;
    - screenshots: `dashboard-{320,768,1280}.png`, `catalog-{320,1280}.png`, `simulation-{320,768,1280}.png`.
  - Зафиксированы key findings:
    - в `simulation-v2` есть mobile/tablet layout проблемы (срез canvas/панелей на 320/768);
    - keyboard traversal на `dashboard/catalog` циклически уходит в `NEXTJS-PORTAL/BODY`, что ухудшает предсказуемость фокуса;
    - повторные запросы `drafts/media apps` при открытии `simulation-v2` (дубликаты в runtime trace);
    - warning React Flow о размере контейнера при узких viewport.
  - Диагностирован и обойден локальный блокер окружения:
    - системный Postgres на `:5432` перехватывал backend DB connection;
    - для audit-сессии поднят docker postgres на `:55432`, backend запущен с `APP_DATABASE_URL=...:55432/app`.
- Evidence:
  - `runtime-network.txt`
  - `runtime-console.txt`
  - `/tmp/backend-dev.log`
- Next step:
  - Перевести runtime findings в приоритизированный backlog: quick wins (a11y focus order, responsive split panes), short-term (simulation layout strategy), mid-term (network dedup/caching policy).

## Entry: 2026-02-25 (mobile refactor stabilization after UI move)
- Date: 2026-02-25
- Task: Стабилизировать промежуточное состояние mobile refactor после переноса UI из `home/impl` в `catalog/profile/player` impl-модули.
- Decision/Change:
  - Исправлена сборка `player-impl` после переноса `SimulationScreen`:
    - в `mobile/feature/player/impl/build.gradle.kts` добавлена зависимость `libs.coil3.network.ktor`, необходимая для `NetworkHeaders`/`httpHeaders` API.
  - Убран KMP hierarchy warning в `home-impl`:
    - из `mobile/feature/home/impl/build.gradle.kts` удален искусственный source set `jvmAndroid` и лишние `dependsOn(...)` связи `androidMain/jvmMain` -> `jvmAndroid`.
  - Восстановлена test-конфигурация API модулей после изменения Gradle-файлов:
    - `mobile/feature/catalog/api/build.gradle.kts`
    - `mobile/feature/profile/api/build.gradle.kts`
    - `mobile/feature/player/api/build.gradle.kts`
    - во всех добавлен `jvmTest.dependencies { implementation(kotlin("test")) }`.
  - Снят warning по clipboard API в player UI без изменения поведения:
    - в `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/ui/player/components/LessonCheatSheetView.kt`
      доступ к `LocalClipboardManager` помечен `@Suppress("DEPRECATION")` до появления common-safe миграции на новый suspend `Clipboard` API.
- Why:
  - После архитектурного переноса UI кодовая база была в partially-broken состоянии: компиляция `player-impl` и API contract tests падали из-за неполных module dependencies.
- Validation:
  - `cd mobile && ./gradlew :feature:home:impl:compileKotlinJvm :feature:catalog:impl:compileKotlinJvm :feature:player:impl:compileKotlinJvm :feature:profile:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:catalog:api:jvmTest :feature:catalog:impl:jvmTest :feature:profile:api:jvmTest :feature:profile:impl:jvmTest :feature:player:api:jvmTest :feature:player:impl:jvmTest` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew test` -> `BUILD SUCCESSFUL`.

## Entry: 2026-02-26 (web auth page visual redesign desktop-first, mobile-preserving)
- Date: 2026-02-26
- Task: Привести в порядок визуал страницы логина в `web`, при этом сохранить мобильную версию максимально близкой к прежнему виду.
- Decision/Change:
  - Обновлена структура auth page для desktop-сцены:
    - `web/app/auth/page.tsx` теперь использует двухколоночный layout (`intro + auth card`) и более выразительный визуальный фон.
  - Полностью переработаны стили auth-экрана:
    - `web/app/auth/auth.module.css` — новый desktop visual language (сетка, controlled gradients, новая карточка, типографика, поля/кнопка).
  - Сохранено поведение mobile-варианта по просьбе пользователя:
    - при `max-width: 960px` скрывается intro-блок,
    - при `max-width: 760px` возвращается компактная single-card подача и мягкий фон, близкие к исходной мобильной версии.
- Why:
  - Пользователь отметил низкое качество текущего login UI и отдельно попросил не ломать мобильный web-вид.
- Validation:
  - `cd web && npm run lint` -> passed.
  - `cd web && npm run type-check` -> failed due to pre-existing missing generated API route typings (`app/api/admin/auth/otp/request|verify/route.ts`), не связано с изменениями auth page styles/layout.
  - Follow-up (user request): удалён left intro-блок, оставлена только карточка "Войдите" на всех размерах (`web/app/auth/page.tsx`), с сохранением обновлённой визуальной системы карточки/фона (`web/app/auth/auth.module.css`).

## Entry: 2026-04-01 (settings page visual cleanup)
- Date: 2026-04-01
- Task: Переделать `/settings` в более чистый и спокойный layout после негативного UX-фидбека.
- Decision/Change:
  - `web/app/settings/page.tsx`:
    - введена компактная структура `shell` с ограниченной шириной и четким визуальным ритмом;
    - добавлены RU/EN тексты через `language` (`isRu`) вместо статично смешанного контента;
    - языковой выбор переведен из карточек в 2 компактные action-опции;
    - добавлен явный индикатор текущего языка;
    - добавлен блок `Быстрые переходы` (`groups`, `progress`, `catalog`) для практической навигации из settings.
  - `web/app/settings/settings.module.css`:
    - убрана разреженная композиция, добавлены `shell`, карточный header и более плотная вертикальная структура;
    - упрощены визуальные блоки (минимум декоративности, больше контраста и читаемости);
    - адаптив: на мобильных header становится одно-колоночным, языковые опции выстраиваются в колонку.
- Why:
  - Пользователь явно отметил неудовлетворительный визуал settings-экрана; цель — привести страницу к аккуратному, минималистичному виду в стиле остальной админки.
- Validation:
  - `cd web && npx eslint app/settings/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (dashboard space optimization + right-side icons)
- Date: 2026-04-01
- Task: Улучшить использование пространства на рабочем столе и добавить иконки справа в навигационных элементах.
- Decision/Change:
  - `web/app/dashboard/page.tsx`:
    - добавлен `TileIcon` helper с иконками по типу раздела (`catalog`, `simulation`, `groups`, `progress`, и т.д.);
    - в левом списке разделов справа добавлен компактный блок `label + icon` для лучшей визуальной ориентации;
    - основной контент перестроен в 2-колоночный layout: `mainPrimary` + правый `mainAside`;
    - в правом aside добавлен компактный список быстрых переходов с иконками, чтобы заполнить пустую зону и повысить плотность полезных действий.
  - `web/app/dashboard/dashboard.module.css`:
    - расширены стили split-layout для более рационального desktop-space использования;
    - добавлены стили `sidebarMetaWrap/sidebarIcon` и `mainAside/aside*`;
    - на мобильных (`<=840px`) правая колонка автоматически сворачивается в одну колонку.
- Why:
  - По UX-фидбеку экран выглядел пустым, с избыточным свободным местом справа/внизу; добавление правой utility-колонки и иконок делает интерфейс информативнее без перегруза.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (dashboard sidebar icon position adjustment)
- Date: 2026-04-01
- Task: По UX-фидбеку перенести иконки в блоке `Разделы` из правой части в левую.
- Decision/Change:
  - `web/app/dashboard/page.tsx`:
    - в sidebar-элементах иконка перенесена перед названием раздела;
    - правый край оставлен для статуса `Открыть/Скоро`.
  - `web/app/dashboard/dashboard.module.css`:
    - добавлен стиль `sidebarLead` (иконка в компактной подложке слева);
    - `sidebarLink` переведен на `justify-content: flex-start`;
    - `sidebarTitle` сделан `flex: 1`, `sidebarMeta` закреплен справа через `margin-left: auto`.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (unified back navigation across sections)
- Date: 2026-04-01
- Task: Сделать одинаковый flow навигации — кнопка `Назад` в каждом основном разделе.
- Decision/Change:
  - Добавлена/унифицирована кнопка `Назад` (`/dashboard?lang=...`) на страницах:
    - `web/app/catalog/page.tsx` (в header actions вместо разнородного label),
    - `web/app/groups/page.tsx` (в header actions, удален дублирующий нижний линк),
    - `web/app/progress/page.tsx` (добавлен блок `headerActions` с `Назад` + `Настройки`),
    - `web/app/settings/page.tsx` (label приведен к `Назад`),
    - `web/app/simulation-v2/page.tsx` (оверлейная top-nav кнопка `Назад` для full-screen editor).
  - Обновлены стили:
    - `web/app/progress/progress.module.css` (`headerActions`),
    - `web/app/simulation-v2/simulation-v2.module.css` (`topNav`, позиционирование).
- Why:
  - Пользователь запросил единый предсказуемый navigation flow во всех рабочих разделах.
- Validation:
  - `cd web && npx eslint app/catalog/page.tsx app/groups/page.tsx app/progress/page.tsx app/settings/page.tsx app/simulation-v2/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (compact back arrow UI)
- Date: 2026-04-01
- Task: Заменить крупные кнопки `Назад` на аккуратную компактную стрелку для более чистого header-layout.
- Decision/Change:
  - На `catalog/groups/progress/settings/simulation-v2` кнопка back переведена в icon-only action (левая стрелка) с `aria-label`.
  - Добавлены/обновлены стили `backIconLink` в:
    - `web/app/catalog/catalog.module.css`
    - `web/app/groups/groups.module.css`
    - `web/app/progress/progress.module.css`
    - `web/app/settings/settings.module.css`
    - `web/app/simulation-v2/simulation-v2.module.css`
- Why:
  - Снизить визуальную тяжесть header и сохранить единый узнаваемый паттерн возврата во всех разделах.
- Validation:
  - `cd web && npx eslint app/catalog/page.tsx app/groups/page.tsx app/progress/page.tsx app/settings/page.tsx app/simulation-v2/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (no title drop with back arrow)
- Date: 2026-04-01
- Task: Убрать визуальный эффект «заголовок уехал вниз» после добавления стрелки назад.
- Decision/Change:
  - Перестроена header-композиция для `catalog/groups/progress/settings`:
    - стрелка и title/kicker собраны в одну горизонтальную строку (`titleRow`/`kickerRow`),
    - удалены искусственные top-margin у заголовков/eyebrow.
  - Обновлены стили в:
    - `web/app/catalog/catalog.module.css`
    - `web/app/groups/groups.module.css`
    - `web/app/progress/progress.module.css`
    - `web/app/settings/settings.module.css`
- Why:
  - Сохранить единый back-pattern без потери визуального ритма заголовков.
- Validation:
  - `cd web && npx eslint app/catalog/page.tsx app/groups/page.tsx app/progress/page.tsx app/settings/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (remove redundant dashboard overline)
- Date: 2026-04-01
- Task: Убрать лишнюю надпись сверху на рабочем столе (`Панель куратора / Curator Workspace`).
- Decision/Change:
  - `web/app/dashboard/page.tsx`: удален overline-текст над основным заголовком.
  - `web/app/dashboard/dashboard.module.css`: удален `brandName`, скорректирован `brandBlock` spacing.
- Why:
  - По UX-фидбеку подпись не несет пользы и засоряет верхнюю часть экрана.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (header/back icon unification pass)
- Date: 2026-04-01
- Task: Привести headers к единому паттерну и сделать back-иконку одинаковой по позиции/размеру.
- Decision/Change:
  - На `catalog/groups/progress/settings/simulation-v2` back control переведен на icon-only `Link` (без button-frame), одинаковый размер/цвет.
  - Для `catalog/groups/progress/settings` back-иконка выровнена в одной строке с `h1` (`titleRow`) для единого визуального ритма header.
  - Стили `backIconLink` синхронизированы во всех соответствующих `*.module.css` (22x22 контейнер, 14x14 иконка, единый hover).
- Why:
  - Пользователь запросил полностью унифицированные header и back-иконку на всех разделах.
- Validation:
  - `cd web && npx eslint app/catalog/page.tsx app/groups/page.tsx app/progress/page.tsx app/settings/page.tsx app/simulation-v2/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (settings/header simplification follow-up)
- Date: 2026-04-01
- Task: Удалить лишний текст в settings и убрать лишние межэкранные переходы.
- Decision/Change:
  - `web/app/settings/page.tsx`: удален лишний текстовый маркер в header (`Параметры/Preferences`).
  - `web/app/groups/page.tsx`: удалены дополнительные header-переходы `Каталог/Настройки` (оставлен унифицированный back-паттерн).
  - `web/app/progress/page.tsx`: удален верхний переход в `Настройки`; рабочая фильтрация/действия в контенте сохранены.
  - `web/app/catalog/page.tsx`: удалена надпись `Каталог` над заголовком и убран верхний переход в `Настройки`.
- Why:
  - По UX-фидбеку нужно упростить header и оставить только необходимые элементы для более чистого и единообразного интерфейса.
- Validation:
  - `cd web && npx eslint app/catalog/page.tsx app/groups/page.tsx app/progress/page.tsx app/settings/page.tsx app/dashboard/page.tsx app/simulation-v2/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (dashboard analytics widgets)
- Date: 2026-04-01
- Task: Добавить на главную dashboard с ключевыми метриками и графическими индикаторами.
- Decision/Change:
  - `web/app/dashboard/page.tsx`:
    - добавлены server-side метрики по доступным правам:
      - количество курсов (`fetchCourses`),
      - количество групп и участников (`fetchGroups`, `fetchGroupUsers`),
      - средний прогресс и отстающие (`fetchProgressOverview`),
      - с graceful fallback (`-`) при отсутствии прав/ошибках.
    - добавлены KPI-карточки и 2 графических блока:
      - покрытие разделов (доступно/готово к работе),
      - оперативная сводка (доступы, скрытые разделы, отстающие).
  - `web/app/dashboard/dashboard.module.css`:
    - добавлены стили `analyticsPanel`, `metricsGrid`, `chartCard`, `chartTrack`, `snapshotList`.
    - добавлена адаптивность метрик/графиков для мобильного (single-column).
- Why:
  - По запросу пользователя главная страница должна содержать информативный dashboard с визуальными метриками, а не только навигацию.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (dashboard content alignment: sections left, content right)
- Date: 2026-04-01
- Task: По UX-фидбеку сохранить читаемый layout: слева список разделов, справа основной контент (без отдельного выноса блоков сверху).
- Decision/Change:
  - Убрана отдельная верхняя analytics-секция, которая отодвигала основной workspace вниз.
  - Метрики и mini-bars встроены в правую часть основного контента (`inlineAnalytics`) внутри `mainPanel`.
  - Сохранены ключевые KPI/coverage данные, но в более компактной форме без разрыва флоу.
  - `mainPanel` возвращен к single-column content flow, чтобы правая часть выглядела как единый рабочий контент.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (dashboard profile actions + settings icon fix)
- Date: 2026-04-01
- Task: Продолжить вертикальный список разделов и добавить профильный блок с выходом/входом в другой аккаунт; исправить иконку настроек на главной.
- Decision/Change:
  - `web/app/dashboard/page.tsx`:
    - убран крупный правый блок с заголовком/CTA (`Управление каталогом`),
    - добавлен компактный правый `Profile` блок: имя/роль + actions,
    - добавлен выход через новый client-компонент и ссылка входа в другой аккаунт,
    - иконка настроек переведена в компактный icon-only `Link`.
  - `web/src/features/auth/components/logout-action-button.tsx`:
    - новый client action button, вызывает `/api/admin/auth/logout` и редиректит на `/auth?lang=...`.
  - `web/app/dashboard/dashboard.module.css`:
    - переработан `workspaceSplit` под более плотный layout с секциями вниз,
    - добавлены стили `profilePanel/profileActions/profileButton/profileLink`,
    - уменьшен и упрощен `settingsIconLink`.
  - `web/app/simulation-v2/page.tsx` и `web/app/simulation-v2/simulation-v2.module.css`:
    - удален overlay-back, вызывавший наложение.
  - `web/src/features/simulation/ui/editor/SimulationEditor.tsx` + `SimulationEditor.module.css`:
    - back в toolbar сделан icon-only и нейтральным (без синей текстовой ссылки).
- Why:
  - По UX-фидбеку нужно убрать визуально тяжелые и дублирующие блоки, сохранить список разделов вертикальным и добавить понятный сценарий смены пользователя.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx app/simulation-v2/page.tsx src/features/simulation/ui/editor/SimulationEditor.tsx src/features/auth/components/logout-action-button.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (dashboard width utilization fix)
- Date: 2026-04-01
- Task: Убрать ощущение пустого пространства справа и лучше использовать ширину рабочей области.
- Decision/Change:
  - `web/app/dashboard/dashboard.module.css`:
    - `workspaceSplit` изменен на `minmax(280px, 420px) minmax(0, 1fr)` (правая колонка теперь растягивается на доступную ширину),
    - у `mainPanel` добавлен `width: 100%` для стабильного заполнения колонки.
- Why:
  - По скриншоту правая часть интерфейса выглядела зажатой и оставляла большой пустой участок справа.
- Validation:
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (dashboard visual style alignment to reference)
- Date: 2026-04-01
- Task: Сделать главную ближе к референсу admin-dashboard: вертикальное левое меню + насыщенный правый блок с KPI/графиком.
- Decision/Change:
  - `web/app/dashboard/page.tsx`:
    - правая часть переработана в `dashboardShell` с верхней строкой (greeting + search + period),
    - добавлена сетка KPI-карточек (`statGrid`) в стиле CRM/dashboard,
    - добавлен блок графика `Learning pulse` (SVG polyline) с легендой,
    - профильный блок закреплен в левой колонке с разделами.
  - `web/app/dashboard/dashboard.module.css`:
    - добавлены стили для новых dashboard-компонентов (`dashboardTopBar`, `searchInput`, `statCard`, `chartPanel`, etc.),
    - обновлена адаптивность под узкие экраны.
  - `web/src/features/simulation/ui/editor/*`:
    - убран конфликтующий overlay-back, back в editor toolbar оставлен как компактная icon-only стрелка.
- Why:
  - По пользовательскому фидбеку текущий вид выглядел «не как dashboard»; нужен более узнаваемый admin-style layout.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (remove redundant top status chips)
- Date: 2026-04-01
- Task: Убрать блок с дублирующей информацией `Роль / Профиль / Доступы` на главной.
- Decision/Change:
  - `web/app/dashboard/page.tsx`: удален `statusStrip` section и связанные label-константы.
- Why:
  - По UX-фидбеку блок перегружает верх экрана и дублирует профильную информацию из левого блока.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx` -> passed.

## Entry: 2026-04-01 (dashboard composition follow-up)
- Date: 2026-04-01
- Task: Довести композицию dashboard под референс: профиль в колонке разделов, правая часть как единый аналитический контент.
- Decision/Change:
  - `web/app/dashboard/page.tsx`:
    - профильный блок закреплен в левой колонке под списком разделов,
    - правая колонка содержит dashboard shell с KPI/поиском/графиком,
    - удалены дублирующие промежуточные блоки и лишний текст в верхней части.
  - `web/app/dashboard/dashboard.module.css`:
    - скорректированы пропорции колонок и стили новых dashboard-элементов.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (settings section simplification + settings nav relocation)
- Date: 2026-04-01
- Task: Переделать settings-экран и сделать доступ к настройкам более понятным на главной.
- Decision/Change:
  - `web/app/dashboard/page.tsx`:
    - удалена маленькая gear-иконка из top-right header,
    - `Настройки` добавлены как полноценный пункт в левом списке `Разделы` (с иконкой),
    - блок аккаунта переведен в раскрывающийся режим (`details/summary`) — `Выйти` и `Войти в другой аккаунт` показываются только по нажатию.
  - `web/app/dashboard/dashboard.module.css`:
    - упрощен header layout (`topBar` one-column),
    - добавлены стили `profileMenu`/`profileMenuSummary`.
  - `web/app/settings/page.tsx`:
    - убран блок `Быстрые переходы`,
    - упрощен текст и оставлен фокус на настройках языка.
- Why:
  - По UX-фидбеку иконка настроек выглядела неочевидно, а settings-экран содержал лишний шум.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx app/settings/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (dashboard cleanup: remove fake search + compact profile actions)
- Date: 2026-04-01
- Task: Упростить dashboard: убрать нефункциональный поиск и сделать действия профиля компактными.
- Decision/Change:
  - `web/app/dashboard/page.tsx`:
    - удален неработающий search input из верхней панели dashboard-блока,
    - `Управление аккаунтом` заменено на compact icon-only trigger (three-dots) с `aria-label`.
  - `web/app/dashboard/dashboard.module.css`:
    - обновлен стиль `profileMenuSummary` под маленькую icon-button,
    - добавлены hover/size правила для иконки меню.
- Why:
  - По фидбеку пользователя поиск вводил в заблуждение, а текстовый триггер аккаунта выглядел тяжело.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (profile actions visual polish)
- Date: 2026-04-01
- Task: Улучшить внешний вид скрытых действий профиля (не "убого", но компактно).
- Decision/Change:
  - `web/app/dashboard/page.tsx`:
    - заменен icon-only trigger `...` на аккуратный trigger `иконка + Действия аккаунта`.
  - `web/app/dashboard/dashboard.module.css`:
    - переработан стиль `profileMenuSummary`: компактный pill с текстом,
    - улучшены hover/open состояния и spacing блока `profileMenu`.
- Why:
  - По UX-фидбеку кнопка из трех точек выглядела слишком примитивно и визуально «бедно».
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (profile menu trigger compact variant)
- Date: 2026-04-01
- Task: Сделать еще более компактный trigger блока аккаунта: иконка + стрелка без текста.
- Decision/Change:
  - `web/app/dashboard/page.tsx`:
    - в `profileMenuSummary` оставлены иконка и chevron,
    - текст скрыт визуально (`srOnly`) и сохранен для доступности.
  - `web/app/dashboard/dashboard.module.css`:
    - уменьшены отступы trigger,
    - добавлен `profileMenuChevron` и поворот при `open`,
    - добавлен utility-класс `srOnly`.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (profile menu full clickable area)
- Date: 2026-04-01
- Task: Сделать trigger блока аккаунта полноразмерным и кликабельным по всей области.
- Decision/Change:
  - `web/app/dashboard/page.tsx`:
    - summary блока профиля переработан: теперь содержит имя + роль/доступы и chevron,
    - удалена маленькая иконка-триггер, действия аккаунта открываются кликом по всей карточке summary.
  - `web/app/dashboard/dashboard.module.css`:
    - `profileMenuSummary` расширен на всю ширину (`width: 100%`, `justify-content: space-between`),
    - увеличена высота кликабельной зоны и упрощены стили chevron.
- Why:
  - По UX-фидбеку маленький trigger неудобен; нужна крупная, очевидная зона взаимодействия.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (profile avatar feature + compact centered auth actions)
- Date: 2026-04-01
- Task: Добавить аватарки с рабочим функционалом в профиль и сделать кнопки аккаунта меньше/по центру.
- Decision/Change:
  - `web/src/features/auth/components/profile-avatar-picker.tsx` + `.module.css`:
    - добавлен client-компонент выбора аватара из пресетов,
    - выбор сохраняется в `localStorage` per-user (`dashboard-avatar-<user_id>`),
    - показывается текущий аватар или fallback initials.
  - `web/app/dashboard/page.tsx`:
    - интегрирован `ProfileAvatarPicker` в раскрывающийся профильный блок,
    - summary профиля сделан полноразмерным (имя/роль/chevron),
    - удален декоративный мелкий trigger.
  - `web/app/dashboard/dashboard.module.css`:
    - добавлены стили `profileSummaryMain/profileAvatar`,
    - кнопки `Выйти` и `Войти в другой аккаунт` уменьшены и центрированы,
    - улучшен spacing в profile menu.
- Why:
  - По UX-фидбеку нужен не только визуал, но и рабочий функционал аватарок; действия аккаунта должны быть аккуратнее и легче сканироваться.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx src/features/auth/components/profile-avatar-picker.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (move avatar to dedicated profile settings screen)
- Date: 2026-04-01
- Task: Вынести управление аватаром из dashboard в отдельный экран настроек профиля и выровнять кнопки действий.
- Decision/Change:
  - Добавлен новый экран `web/app/settings/profile/page.tsx` + `web/app/settings/profile/profile-settings.module.css`:
    - заголовок профиля,
    - блок аватара (`ProfileAvatarPicker`),
    - действия аккаунта (`Выйти`, `Войти в другой аккаунт`) выровнены по центру и унифицированы по размеру.
  - `web/app/dashboard/page.tsx`:
    - удален picker из dashboard profile-dropdown,
    - добавлен переход `Настройки профиля` в раскрытом меню профиля.
  - Сохранен функционал пресетов аватара через `localStorage` в компоненте `ProfileAvatarPicker`.
- Why:
  - По UX-фидбеку аватар и аккаунт-действия должны жить на отдельном профильном экране, а dashboard должен оставаться легче.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx app/settings/page.tsx app/settings/profile/page.tsx src/features/auth/components/profile-avatar-picker.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (dashboard wording cleanup)
- Date: 2026-04-01
- Task: Убрать лишние подписи в sidebar и тексты-пояснения в модалке профиля.
- Decision/Change:
  - `web/app/dashboard/page.tsx`:
    - удален текст `Открыть` у кликабельных разделов в списке (оставлен только статус `Скоро` для недоступных),
    - в modal `Настройки профиля` удалены служебные тексты `Выбор аватара...` и `Выход и смена аккаунта...`.
- Why:
  - По UX-фидбеку подписи перегружали интерфейс и не добавляли пользы.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (avatar immediate apply fix)
- Date: 2026-04-01
- Task: Починить применение выбранной аватарки в профиле без перезагрузки.
- Decision/Change:
  - Добавлен `ProfileAvatarBadge` (`web/src/features/auth/components/profile-avatar-badge.tsx`) для чтения сохраненного аватара из `localStorage`.
  - `ProfileAvatarPicker` теперь использует badge и после выбора диспатчит событие `dashboard-avatar-updated`.
  - `ProfileAvatarBadge` подписывается на `dashboard-avatar-updated` и `storage`, поэтому аватар сразу обновляется в sidebar/profile summary.
- Why:
  - По фидбеку пользователя выбор аватара сохранялся, но визуально не применялся сразу в профиле.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx src/features/auth/components/profile-avatar-picker.tsx src/features/auth/components/profile-avatar-badge.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (profile name editing)
- Date: 2026-04-01
- Task: Добавить возможность изменять имя профиля из модалки `Настройки профиля`.
- Decision/Change:
  - Backend:
    - добавлен `AuthMeUpdateIn` в `backend/app/modules/auth/api/schemas.py`,
    - добавлен `PATCH /auth/me` в `backend/app/modules/auth/api/router.py` для обновления `display_name` текущего пользователя.
  - Web:
    - `web/app/api/admin/auth/me/route.ts` теперь проксирует `PATCH`,
    - добавлен `updateAdminProfile()` в `web/src/features/auth/api.ts`,
    - добавлен client-компонент `ProfileNameForm` (`web/src/features/auth/components/profile-name-form.tsx` + css),
    - форма встроена в modal `Настройки профиля` на dashboard.
- Why:
  - По запросу пользователя профиль должен поддерживать редактирование имени, а не только выбор аватара.
- Validation:
  - `python3 -m compileall backend/app/modules/auth/api/router.py backend/app/modules/auth/api/schemas.py` -> passed.
  - `cd web && npx eslint app/dashboard/page.tsx src/features/auth/api.ts src/features/auth/components/profile-name-form.tsx src/features/auth/components/profile-avatar-picker.tsx src/features/auth/components/profile-avatar-badge.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (users and access screen)
- Date: 2026-04-01
- Task: Реализовать экран `Пользователи и права`.
- Decision/Change:
  - Backend:
    - добавлен модуль users overview:
      - `backend/app/modules/users/api/router.py`
      - `backend/app/modules/users/api/schemas.py`
      - `backend/app/modules/users/domain/services.py`
      - `backend/app/modules/users/infra/repository.py`
    - endpoint `GET /users/overview` возвращает:
      - список пользователей (имя, логин, роль, статус, число прав),
      - summary по ролям и permission templates.
    - модуль подключен в `backend/app/api/router.py` и `backend/app/shared/di/services.py`.
  - Web:
    - добавлен proxy route `web/app/api/admin/users/overview/route.ts`,
    - добавлен data layer `web/src/features/users/api.ts` + `types.ts`,
    - создан экран `web/app/users/page.tsx` + `web/app/users/users.module.css`:
      - KPI-карточки,
      - блок ролей и доступов,
      - таблица пользователей.
    - пункт `Пользователи и права` на dashboard теперь ведет на `/users`.
- Why:
  - Пользователь запросил следующий функциональный раздел админки после dashboard cleanup.
- Validation:
  - `python3 -m compileall backend/app/modules/users backend/app/api/router.py backend/app/shared/di/services.py` -> passed.
  - `cd web && npx eslint app/users/page.tsx app/dashboard/page.tsx src/features/users/api.ts` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-01 (users management actions)
- Date: 2026-04-01
- Task: Добавить базовые действия на экране `Пользователи и права`.
- Decision/Change:
  - Backend:
    - добавлен `UserUpdateIn` в `backend/app/modules/users/api/schemas.py`,
    - добавлен `PATCH /users/{user_id}` в `backend/app/modules/users/api/router.py`,
    - `UsersService` и `UsersRepository` расширены методами обновления пользователя.
  - Web:
    - добавлен proxy route `web/app/api/admin/users/[userId]/route.ts`,
    - добавлен `updateUser()` в `web/src/features/users/api.ts`,
    - создан client-компонент `UsersAdminTable` с inline-действиями:
      - редактирование имени по blur,
      - смена роли через select,
      - блокировка/разблокировка через status button.
    - страница `web/app/users/page.tsx` переведена на `UsersAdminTable`.
- Why:
  - По запросу пользователя экран должен не только показывать пользователей, но и давать базовое администрирование без переходов в отдельные формы.
- Validation:
  - `python3 -m compileall backend/app/modules/users backend/app/api/router.py backend/app/shared/di/services.py` -> passed.
  - `cd web && npx eslint app/users/page.tsx src/features/users/api.ts src/features/users/components/users-admin-table.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (self-block recovery + protection)
- Date: 2026-04-02
- Task: Восстановить заблокированного администратора и закрыть дыру self-block/self-demotion.
- Root cause:
  - `PATCH /users/{user_id}` позволял текущему администратору менять собственные `status` и `role`,
  - после `status='BLOCKED'` auth-dependency корректно начала возвращать `401 User is inactive or not found`.
- Decision/Change:
  - Backend:
    - `backend/app/modules/users/domain/services.py`: запрещены self-role-change и self-status-change,
    - `backend/app/modules/users/api/router.py`: `ValueError` переводится в `400`.
  - Frontend:
    - `web/src/features/users/components/users-admin-table.tsx`: для текущего пользователя отключены controls роли и статуса, добавлен badge `Вы`.
  - Recovery:
    - найден реальный backend DB connection (`postgresql://app:app@127.0.0.1:5432/app`),
    - восстановлен пользователь `admin`: `status='ACTIVE'`, `role='ADMINISTRATOR'`.
- Validation:
  - `python3 -m compileall backend/app/modules/users/domain/services.py backend/app/modules/users/api/router.py` -> passed.
  - `cd web && npx eslint app/users/page.tsx src/features/users/components/users-admin-table.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (groups and assignments UX refactor)
- Date: 2026-04-02
- Task: Доработать `Группы и назначения` в максимально рабочий UX-flow.
- Decision/Change:
  - `web/src/features/groups/components/groups-workspace.tsx` переписан в сценарный layout:
    - слева плотный список групп + создание новой группы,
    - справа единый workflow без табов:
      1. Данные группы
      2. Участники
      3. Назначения
    - добавлены поиск участников, summary выбранных пользователей и явный режим назначения (`всей группе / выбранным участникам`).
  - `web/src/features/groups/components/groups-workspace.module.css`:
    - добавлены `workflowSection`, `stepHead`, `choiceRow`, `selectionSummary`, `itemStatus` и др.,
    - уплотнен sidebar и улучшен визуальный ритм рабочего сценария.
- Why:
  - По пользовательскому запросу экран должен вести по понятному потоку действий, а не быть набором равноправных табов и форм.
- Validation:
  - `cd web && npx eslint app/groups/page.tsx src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (groups workflow enhancement pass)
- Date: 2026-04-02
- Task: Усилить рабочий UX в `Группы и назначения` после базовой перестройки.
- Decision/Change:
  - `web/src/features/groups/components/groups-workspace.tsx`:
    - добавлены KPI по выбранной группе (`участников`, `назначений`, `активных`, `индивид. целей`),
    - добавлены более полезные empty states,
    - добавлены sticky action bars для сохранения участников, создания назначений и сохранения целей,
    - summary выбранных участников/целей сохранены и усилены как навигационные подсказки.
  - `web/src/features/groups/components/groups-workspace.module.css`:
    - добавлены стили `kpiRow`, `kpiCard`, `actionBar`, `actionHint`, улучшены empty states и mobile behavior.
- Why:
  - По продолжению UX-задачи нужно было сделать экран не просто структурным, а реально удобным в длинной повседневной работе.
- Validation:
  - `cd web && npx eslint app/groups/page.tsx src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (groups premium UX pass)
- Date: 2026-04-02
- Task: Добавить следующий уровень удобства: автосохранение, быстрые фильтры и более читаемые карточки назначений.
- Decision/Change:
  - `web/src/features/groups/components/groups-workspace.tsx`:
    - добавлено автосохранение имени и описания группы по `blur` с fallback-кнопкой `Сохранить группу`,
    - добавлены быстрые фильтры участников и целевых участников (`все / выбраны / не выбраны`),
    - усилена шапка карточек назначений: заголовок курса + окно дат (`starts_at` / `ends_at`).
  - `web/src/features/groups/components/groups-workspace.module.css`:
    - добавлены стили `savedHint`, `filterRow`, `filterChip`, `assignmentHeader`, `assignmentDate`.
- Why:
  - Экран уже стал структурным, теперь нужно было сделать его быстрее в ежедневной работе и снизить количество лишних ручных действий.
- Validation:
  - `cd web && npx eslint app/groups/page.tsx src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (groups next-step guidance)
- Date: 2026-04-02
- Task: Добавить на экран `Группы и назначения` контекстную подсказку следующего шага.
- Decision/Change:
  - `web/src/features/groups/components/groups-workspace.tsx`:
    - добавлен `nextStep` через `useMemo`, зависящий от состояния группы:
      - нет участников,
      - нет назначений,
      - нет активных назначений,
      - группа полностью настроена.
    - в UI добавлена карточка `Следующий шаг` над workflow sections.
  - `web/src/features/groups/components/groups-workspace.module.css`:
    - добавлены стили `nextStepCard`, `nextStepLabel`, `nextStepTitle`, `nextStepText`.
- Why:
  - По UX-цели экран должен не просто показывать данные, а вести пользователя к следующему полезному действию.
- Validation:
  - `cd web && npx eslint app/groups/page.tsx src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (groups final visual polish)
- Date: 2026-04-02
- Task: Сделать финальный visual polish для `Группы и назначения`.
- Decision/Change:
  - `web/src/features/groups/components/groups-workspace.tsx`:
    - добавлен `activeStep`, завязанный на состоянии группы (`участники`, `назначения`, `активные назначения`),
    - активная workflow section теперь визуально выделяется.
  - `web/src/features/groups/components/groups-workspace.module.css`:
    - добавлен `workflowSectionActive`,
    - усилены KPI карточки,
    - карточки назначений получили более четкую шапку, фон и мета-чипы.
- Why:
  - После функциональных улучшений нужно было сделать экран визуально более читаемым и направляющим взгляд пользователя.
- Validation:
  - `cd web && npx eslint app/groups/page.tsx src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (move group creation out of sidebar)
- Date: 2026-04-02
- Task: Убрать форму создания группы из боковой колонки и вынести ее отдельно.
- Decision/Change:
  - `web/src/features/groups/components/groups-workspace.tsx`:
    - форма создания удалена из sidebar,
    - добавлена компактная кнопка `Новая группа`,
    - создание группы вынесено в modal overlay.
  - `web/src/features/groups/components/groups-workspace.module.css`:
    - добавлены стили `modalOverlay`, `modalCard`, `modalHeader`, `modalClose`, `modalActions`.
- Why:
  - По UX-фидбеку форма в sidebar мешала списку групп и конкурировала с основным сценарием работы.
- Validation:
  - `cd web && npx eslint app/groups/page.tsx src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (groups readiness and guided feedback)
- Date: 2026-04-02
- Task: Добавить управляемость экрана `Группы и назначения`: готовность, прогресс шагов, success feedback.
- Decision/Change:
  - `web/src/features/groups/components/groups-workspace.tsx`:
    - добавлен `readiness` (% готовности группы),
    - добавлен `progressRail` по шагам (`группа`, `участники`, `назначения`),
    - добавлен `success` state для ключевых операций,
    - добавлены умные empty states для фильтров участников.
  - `web/src/features/groups/components/groups-workspace.module.css`:
    - добавлены стили `progressRail`, `progressStep*`, `success`,
    - KPI расширены до 5 карточек с `Готовность`.
- Why:
  - Экран должен не просто отображать форму, а показывать пользователю, насколько группа реально доведена до рабочего состояния и что изменилось после действий.
- Validation:
  - `cd web && npx eslint app/groups/page.tsx src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (assignment targets modal)
- Date: 2026-04-02
- Task: Вынести редактирование `Индивидуальных целей` из карточки назначения в отдельную модалку.
- Decision/Change:
  - `web/src/features/groups/components/groups-workspace.tsx`:
    - inline-редактор целей удален из карточки назначения,
    - добавлена modal workflow для `editingAssignmentId`,
    - в модалке: заголовок, выбранное назначение, поиск, список участников, `Отмена` / `Сохранить цели`.
  - Поведение редактора очищает временное состояние при закрытии модалки.
- Why:
  - По UX-цели основной экран должен оставаться легким и читаемым; deep-editing сценарии лучше выносить в модалку.
- Validation:
  - `cd web && npx eslint app/groups/page.tsx src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (progress UX refinement)
- Date: 2026-04-02
- Task: Довести экран `Прогресс` до уровня guided analytics UI.
- Decision/Change:
  - `web/app/progress/page.tsx`:
    - добавлен KPI `Отстающих записей`,
    - добавлен блок `Фокус` с краткой интерпретацией текущего состояния отчета,
    - фильтры оформлены как отдельный control-center с коротким описанием,
    - добавлены quick-stats по результату фильтрации,
    - удален дублирующий нижний back-link и лишняя кнопка `Панель` в фильтрах.
  - `web/app/progress/progress.module.css`:
    - усилены KPI-карточки,
    - добавлены стили `nextStep*`, `filtersHead`, `quickStatsRow`, `quickStat`,
    - усилена читаемость таблицы заголовков/отступов.
- Why:
  - По UX-аудиту экран выглядел скорее как таблица с фильтрами, чем как аналитическая панель принятия решений.
- Validation:
  - `cd web && npx eslint app/progress/page.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (cross-screen consistency pass)
- Date: 2026-04-02
- Task: Выровнять визуальные паттерны между ключевыми экранами админки.
- Decision/Change:
  - `web/app/progress/progress.module.css`:
    - приведен background к общему radial-gradient паттерну,
    - title line-height и subtitle max-width выровнены под `groups/users`.
  - `web/app/users/users.module.css`:
    - добавлен hover-state для back icon link,
    - title line-height выровнен под остальные экраны.
  - `web/src/features/groups/components/groups-workspace.module.css`:
    - modal close hover приведен к тому же паттерну, что и в dashboard modals.
- Why:
  - После нескольких независимых улучшений экраны стали близки по качеству, но ещё отличались по “ритму” и микровзаимодействиям.
- Validation:
  - `cd web && npx eslint app/progress/page.tsx app/users/page.tsx src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (friendly frontend error handling)
- Date: 2026-04-02
- Task: Убрать сырые `Request failed (...)` и raw backend messages из UI, заменить на обработанные ответы.
- Decision/Change:
  - Добавлен общий parser: `web/src/shared/lib/api-error.ts`
    - `extractApiErrorMessage(raw, status, fallback)` разбирает JSON `detail/message`, чистит хвостовые артефакты и скрывает техничные `Request failed...`.
    - `toUserErrorMessage(error, fallback)` нормализует ошибки для UI.
  - Обновлены API-слои:
    - `web/src/features/auth/api.ts`
    - `web/src/features/groups/api.ts`
    - `web/src/features/users/api.ts`
    - `web/src/features/progress/api.ts`
  - Обновлены пользовательские формы/экраны:
    - `auth-form.tsx`
    - `profile-name-form.tsx`
    - `groups-workspace.tsx`
    - `users-admin-table.tsx`
  - В `UsersAdminTable` добавлен inline error output вместо тихого провала.
- Why:
  - По запросу пользователя интерфейс должен показывать обработанные, понятные сообщения, а не голые backend/raw transport errors.
- Validation:
  - `cd web && npx eslint src/shared/lib/api-error.ts src/features/auth/api.ts src/features/auth/components/auth-form.tsx src/features/auth/components/profile-name-form.tsx src/features/groups/api.ts src/features/groups/components/groups-workspace.tsx src/features/users/api.ts src/features/users/components/users-admin-table.tsx src/features/progress/api.ts` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (mobile layout polish)
- Date: 2026-04-02
- Task: Пройтись по мобильной/узкой компоновке ключевых экранов админки.
- Decision/Change:
  - `web/app/dashboard/dashboard.module.css`:
    - уменьшены mobile title/subtitle,
    - уплотнены секции/панели/sidebar links,
    - chart legend на mobile переводится в вертикальный stack.
  - `web/app/progress/progress.module.css`:
    - фильтры на mobile собираются в single-column,
    - все controls растягиваются на ширину контейнера,
    - quick stats идут колонкой.
  - `web/app/users/users.module.css`:
    - title/subtitle уплотнены,
    - role/permission cards переходят в single-column.
  - `web/src/features/groups/components/groups-workspace.module.css`:
    - workflow/panel/modal padding уплотнен,
    - modal actions на mobile растягиваются по ширине.
- Why:
  - После desktop polish нужно было убрать визуальную тяжесть и случайные перепады ширины на узких экранах.
- Validation:
  - `cd web && npx eslint app/dashboard/page.tsx app/progress/page.tsx app/users/page.tsx src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (dedupe users in selectors)
- Date: 2026-04-02
- Task: Убрать дубли пользователей в UI-списках выбора.
- Decision/Change:
  - `web/src/features/groups/components/groups-workspace.tsx`:
    - добавлен `uniqueUsers` по `user_id`,
    - все member/assignment selectors и summary переведены на `uniqueUsers`.
  - `web/app/progress/page.tsx`:
    - список пользователей в фильтре `Все пользователи` дедуплицируется по `user_id`.
- Why:
  - По реальному smoke-test в `Groups` и `Progress` одни и те же пользователи отображались по нескольку раз, что ломало UX выбора.
- Validation:
  - `cd web && npx eslint app/progress/page.tsx src/features/groups/components/groups-workspace.tsx` -> passed.
  - `cd web && npm run type-check` -> passed.

## Entry: 2026-04-02 (verification continuation + lint cleanup)
- Date: 2026-04-02
- Task: Продолжить работу после UX/UI изменений: прогнать полную верификацию и устранить оставшиеся lint-шумы.
- Decision/Change:
  - Web:
    - `web/app/api/admin/catalog/courses/[courseId]/structure/bulk/route.ts`:
      - удалены неиспользуемые импорты `NextResponse` и `getAdminAccessToken`.
  - Backend:
    - применен `ruff --fix` для import-order в файлах:
      - `backend/app/modules/auth/api/router.py`
      - `backend/app/modules/users/api/router.py`
      - `backend/scripts/course_builder_mocks.py`
- Why:
  - Нужно было довести состояние репозитория до clean verification без предупреждений/ошибок перед следующими шагами (commit/PR или дополнительный UI pass).
- Validation:
  - `cd backend && ruff check .` -> passed.
  - `cd backend && PYTHONPATH=. pytest` -> passed (`275 passed, 1 skipped`).
  - `cd web && npm run lint` -> passed.
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run build` -> passed.

## Entry: 2026-04-02 (API error handling hardening pass)
- Date: 2026-04-02
- Task: Продолжить стабилизацию UX и убрать сырые/шумные transport ошибки в оставшихся API клиентах web.
- Decision/Change:
  - Расширен общий helper `web/src/shared/lib/api-error.ts`:
    - добавлена нормализация строковых, массивных и объектных error payload;
    - корректная очистка кавычек по краям;
    - fallback для HTML/JSON raw-body, чтобы не показывать пользователю технический мусор.
  - Переведены на `extractApiErrorMessage(...)` оставшиеся API слои:
    - `web/src/features/course-builder/api.ts`
    - `web/src/features/catalog/api.ts`
    - `web/src/features/catalog/builder-api.ts`
    - `web/src/features/catalog/write-api.ts`
    - `web/src/features/course-wizard/api.ts`
    - `web/src/features/simulation/api/client.ts`
  - В `web/src/features/catalog/api.ts` success-парсинг переведен на text+JSON.parse с guard на пустой body, чтобы избежать runtime ошибок при пустых 2xx ответах.
- Why:
  - После предыдущего улучшения ошибок оставались участки, где UI мог показывать `Request failed (...)` или raw body.
  - Нужна единая, дружелюбная, устойчивая обработка ошибок на ключевых потоках (`catalog/course-builder/course-wizard/simulation`).
- Validation:
  - `cd web && npm run lint` -> passed.
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run build` -> passed.

## Entry: 2026-04-02 (remove alert dialogs from critical admin flows)
- Date: 2026-04-02
- Task: Заменить `window.alert(...)` в ключевых пользовательских действиях на встроенные UI ошибки.
- Decision/Change:
  - Catalog actions menu:
    - `web/src/features/catalog/components/course-status-toggle-button.tsx`
    - `web/src/features/catalog/components/course-delete-button.tsx`
    - добавлены inline `errorMessage` + `role="alert"` вместо модальных alert.
    - ошибки нормализуются через `toUserErrorMessage(...)`.
  - Catalog page wiring:
    - `web/app/catalog/page.tsx`
    - передан `errorClassName` для action buttons в dropdown меню.
    - `web/app/catalog/catalog.module.css` добавлен стиль `.actionsMenuError`.
  - Course builder header:
    - `web/src/features/course-builder/ui/CourseBuilderHeader.tsx`
    - `web/src/features/course-builder/ui/CourseBuilderHeader.module.css`
    - убраны alert при сохранении title/description;
    - добавлен `saveError` banner для ошибок save/cover upload/cover remove.
  - Catalog write panel:
    - `web/src/features/catalog/components/catalog-write-panel.tsx`
    - preview-load error теперь идет в существующий `taskState` вместо `alert(...)`.
- Why:
  - Браузерные alert прерывали рабочий flow и давали резкий UX; inline ошибки сохраняют контекст и читаются лучше.
- Validation:
  - `cd web && npm run lint` -> passed.
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run build` -> passed.

## Entry: 2026-04-02 (shared empty/error state pattern for progress and users)
- Date: 2026-04-02
- Task: Унифицировать отображение empty/error состояний между разделами `Progress` и `Users`.
- Decision/Change:
  - Добавлен общий UI primitive:
    - `web/src/shared/ui/data-state.tsx`
    - `web/src/shared/ui/data-state.module.css`
    - Нейтральный и error визуальные тона, compact mode, управляемый `role` (`status|alert`).
  - `web/app/progress/page.tsx`:
    - chart empty states переведены на `DataState`;
    - table empty state вынесен в отдельный `DataState` блок вместо пустой строки таблицы.
  - `web/app/users/page.tsx`:
    - добавлен унифицированный empty state для пустого `role_summary`.
  - `web/src/features/users/components/users-admin-table.tsx`:
    - empty users state переведен на `DataState`;
    - mutation error переведен на `DataState` c `tone="error"` + `role="alert"`.
  - Учитывая oracle-review:
    - `DataState` больше не навязывает live-region семантику по умолчанию; роль задается явно в местах, где это реально нужно.
- Why:
  - Ранее состояния "нет данных" и ошибки отображались разными паттернами (plain text/table-row/alert), что дробило UX.
  - Единый primitive ускоряет дальнейшую унификацию `groups/progress/users/catalog`.
- Validation:
  - `cd web && npm run lint` -> passed.
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run build` -> passed.

## Entry: 2026-04-02 (extend shared state pattern to groups and catalog)
- Date: 2026-04-02
- Task: Довести единый `DataState` паттерн до разделов `Groups` и `Catalog`.
- Decision/Change:
  - `web/src/features/catalog/components/catalog-sidebar.tsx`:
    - ошибки/пустой список курсов переведены на `DataState`.
  - `web/src/features/catalog/components/catalog-release-list.tsx`:
    - состояния "курс не выбран", "ошибка релизов", "нет релизов" переведены на `DataState`.
  - `web/src/features/groups/components/groups-workspace.tsx`:
    - empty state до выбора группы;
    - empty state для недоступных пользователей;
    - empty state для фильтров участников/целевых пользователей;
    - empty state для списка назначений;
    - error banner переведен на `DataState` c `tone="error"` + `role="alert"`.
- Why:
  - До этого `groups` и часть `catalog` использовали разрозненные `p.muted`/локальные блоки, что визуально и поведенчески отличалось от уже унифицированных `progress/users`.
  - Теперь empty/error сценарии в основных operational разделах следуют единому reusable-паттерну.
- Validation:
  - `cd web && npm run lint` -> passed.
  - `cd web && npm run type-check` -> passed.
  - `cd web && npm run build` -> passed.

### Update: 2026-04-06 (Learning search bar aligned to Home)

- Во вкладке `Learning` заменён блок поиска курсов на Home-style search bar:
  - контейнер `cardLg` + `surfaceContainerHighest`,
  - иконка `Search` слева,
  - текстовый ввод в типографике `titleMedium`,
  - круглая правая кнопка с иконкой `Mic` в primary-цвете.
- Сохранена функциональность фильтрации курсов по введённому запросу (поиск не стал декоративным).
- Уменьшен вертикальный отступ между верхним заголовком `Обучение` и search bar:
  - удалён лишний верхний spacer,
  - `LazyColumn` top padding снижен до `UiSpacing.xs`.
- Изменённые файлы:
  - `mobile/feature/player/impl/src/commonMain/kotlin/com/digitaledu/feature/player/impl/ui/LessonContent.kt`
- Validation:
  - `cd mobile && ./gradlew :feature:player:impl:compileKotlinJvm` -> `BUILD SUCCESSFUL`.
  - `cd mobile && ./gradlew :feature:player:impl:compileAndroidMain` -> `BUILD SUCCESSFUL`.

## Entry: 2026-04-09 (local mock data restoration + DB schema repair)
- Date: 2026-04-09
- Task: Вернуть локальные mock/demo данные после повторной потери сидов и битого состояния локальной Postgres-схемы.
- Decision/Change:
  - Исправлен `backend/scripts/course_builder_mocks.py`:
    - добавлен импорт `app.modules.users.models.User`, чтобы SQLAlchemy зарегистрировал таблицу `users` до работы с `Course.author_id`.
  - Добавлен regression test `backend/tests/test_course_builder_mocks_script.py`:
    - проверяет, что CLI `scripts/course_builder_mocks.py seed` завершается успешно.
  - Локальная БД на `127.0.0.1:5432/app` была в stamped-but-broken состоянии:
    - `alembic current` показывал `head`, но сиды падали на отсутствующих таблицах (`users`, затем `groups`).
    - перед ремонтом создан backup: `.backups/db/20260409-184436_mock-data-restore-schema-repair.sql.gz`.
    - выполнен reset schema `public` и повторный `alembic upgrade head`.
  - После ремонта восстановлены локальные данные через non-destructive seed-команды:
    - `make builder-mocks`
    - `make dashboard-demo-seed`
    - `make mobile-runtime-heavy-seed`
- Why:
  - Пользовательский запрос был про возврат всех mock/demo данных.
  - Простого повторного seed было недостаточно: локальная схема была неконсистентна, поэтому сиды падали на отсутствующих таблицах.
- Validation:
  - `cd backend && PYTHONPATH=. pytest tests/test_course_builder_mocks_script.py -q` -> passed.
  - `make builder-mocks` -> passed.
  - `make dashboard-demo-seed` -> passed.
  - `make mobile-runtime-heavy-seed` -> passed.
  - `make mobile-runtime-heavy-verify` -> passed (`/catalog/courses`: 8, `gosuslugi-basic`: 4 screens).
  - DB spot-check:
    - `builder_courses=2`
    - `mobile_courses=6`
    - `demo_groups=2`
    - `demo_users=5`

## Entry: 2026-04-09 (schema guard + local repair hardening)
- Date: 2026-04-09
- Task: Исключить повторение stamped-but-broken локальной схемы при запуске и сидировании.
- Decision/Change:
  - Добавлены shared-инструменты проверки/ремонта схемы:
    - `backend/scripts/db_schema_health.py` — проверка обязательных public-таблиц.
    - `backend/scripts/repair_local_db_schema.py` — guarded repair только для `127.0.0.1/localhost`, с backup + reset `public` + `alembic upgrade head`.
  - Seed-скрипты теперь fail-fast по схеме до начала сидирования:
    - `course_builder_mocks.py`, `digital_literacy_demo_seed.py`, `mobile_runtime_demo_seed.py`, `progress_mocks.py`.
  - `Makefile` дополнен targets:
    - `db-schema-health`
    - `db-schema-repair-local`
    - demo/mock seed targets завязаны на `db-schema-health` preflight.
  - `scripts/doctor.py` переведён на тот же schema-health helper.
  - `run` больше не использует отдельную кастомную проверку/repair-логику; он реиспользует `db_schema_health.py` + `repair_local_db_schema.py`.
  - Исправлен runtime edge-case: пустой `APP_DATABASE_URL` больше не экспортируется как override (иначе SQLAlchemy не мог распарсить URL).
- Tests:
  - Добавлены и пройдены:
    - `backend/tests/test_db_schema_health.py`
    - `backend/tests/test_demo_seed_schema_guard.py`
    - `backend/tests/test_local_schema_repair_script.py`
- Validation:
  - `cd backend && PYTHONPATH=. pytest tests/test_db_schema_health.py tests/test_demo_seed_schema_guard.py tests/test_local_schema_repair_script.py -q` -> passed.
  - `ALLOW_LOCAL_SCHEMA_REPAIR=1 make db-schema-repair-local` -> passed.
  - `make db-schema-health` -> passed.
  - `make builder-mocks && make literacy-demo-seed && make mobile-runtime-seed && make mobile-runtime-verify` -> passed.
  - `make run-bg` -> stack started healthy.
  - `make doctor` -> passed.
- Why:
  - Ранее миграционное состояние могло быть `head`, но фактические таблицы отсутствовали, что приводило к плавающим падениям сидов/логина.
  - Теперь есть единый источник истины для health-check и единый guarded repair path.
