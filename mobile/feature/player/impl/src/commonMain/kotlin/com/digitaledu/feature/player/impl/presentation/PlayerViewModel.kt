package com.digitaledu.feature.player.impl.presentation

import androidx.lifecycle.viewModelScope
import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.data.catalog.CatalogRepository
import com.digitaledu.core.data.memo.MemoLocalStorage
import com.digitaledu.core.data.progress.ProgressRepository
import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.catalog.CatalogScreen
import com.digitaledu.core.model.content.CheatSheetPayload
import com.digitaledu.core.model.content.Hotspot
import com.digitaledu.core.model.content.SimulationPayload
import com.digitaledu.core.model.memo.SavedMemo
import com.digitaledu.core.model.progress.LessonSessionAnalyticsCreate
import com.digitaledu.feature.player.api.PlayerEffect
import com.digitaledu.feature.player.api.PlayerFeatureHost
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.api.PlayerUiState
import com.digitaledu.feature.player.impl.domain.HotspotAction
import com.digitaledu.feature.player.impl.domain.NavigationCommand
import com.digitaledu.feature.player.impl.domain.ProgressTransitionUseCase
import com.digitaledu.feature.player.impl.domain.ResolveHotspotActionUseCase
import com.digitaledu.feature.player.impl.domain.ResolveCompletedLessonIdUseCase
import com.digitaledu.feature.player.impl.domain.ResolveNavigationUseCase
import com.digitaledu.feature.player.impl.domain.RestoreCourseProgressUseCase
import com.digitaledu.feature.player.impl.domain.SavedCourseProgress
import com.digitaledu.feature.player.impl.domain.SimulationUrlResolver
import kotlin.random.Random
import kotlin.time.Clock
import kotlin.time.ExperimentalTime
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

@OptIn(ExperimentalTime::class)
internal class PlayerViewModel(
    private val urlResolver: SimulationUrlResolver,
    private val catalogRepository: CatalogRepository,
    private val authRepository: AuthRepository,
    private val progressRepository: ProgressRepository,
    private val memoLocalStorage: MemoLocalStorage,
) : BaseViewModel<PlayerUiState, PlayerIntent, PlayerEffect>(PlayerUiState()), PlayerFeatureHost {

    private val courseProgress = mutableMapOf<String, SavedCourseProgress>()
    private val progressTransition = ProgressTransitionUseCase()
    private val restoreCourseProgress = RestoreCourseProgressUseCase()
    private val resolveNavigation = ResolveNavigationUseCase(progressTransition = progressTransition)
    private val resolveCompletedLessonId = ResolveCompletedLessonIdUseCase()
    private val resolveHotspotAction = ResolveHotspotActionUseCase()

    private var currentLessonSessionStartedAt: String? = null
    private var currentLessonHintLevelMax: Int = 0
    private var currentLessonErrorAttempts: Int = 0

    init {
        viewModelScope.launch {
            authRepository.observeTokens().collect { tokens ->
                updateState { copy(mediaAccessToken = tokens?.accessToken) }
            }
        }
    }

    override suspend fun handleIntent(intent: PlayerIntent) {
        when (intent) {
            PlayerIntent.Next -> goToNextScreen()
            PlayerIntent.Previous -> goToPreviousScreen()
            is PlayerIntent.NavigateToScreen -> navigateToScreenKey(intent.screenKey)
            is PlayerIntent.ClickHotspot -> onHotspotClick(intent.hotspot)
            PlayerIntent.DismissHotspotHint -> dismissHotspotHint()
            PlayerIntent.EnterFullscreen -> enterFullscreenPlayer()
            PlayerIntent.ExitFullscreen -> exitFullscreenMode()
            PlayerIntent.ToggleFavorite -> toggleFavorite()
            PlayerIntent.ToggleMemoSaved -> toggleMemoSaved()
            is PlayerIntent.CreateNote -> createNote(intent.content)
            PlayerIntent.FinishLesson -> finishCurrentLesson()
            PlayerIntent.ReturnToCourseDetails -> returnToCourseDetails()
            is PlayerIntent.RecordSimulationError -> recordSimulationError(intent.hintLevel)
            PlayerIntent.Close -> closeCourse()
        }
    }

    override fun openBundle(bundle: CatalogBundle, startFullscreen: Boolean, showContents: Boolean) {
        val restoredProgress = restoreProgress(bundle)
        updateState {
            copy(
                bundle = bundle,
                currentScreenIndex = restoredProgress.currentScreenIndex,
                isFullscreenMode = startFullscreen,
                mediaAccessToken = mediaAccessToken,
                completedScreens = restoredProgress.completedScreens,
                activeHotspotHint = null,
                showLessonSummary = false,
                showCourseContents = showContents,
            )
        }
        resetSessionTelemetry()
        startSessionIfPossible()
        refreshProgressAndReference()
    }

    override fun resolveImageUrl(rawUrl: String): String = urlResolver.resolve(rawUrl)

    private fun goToPreviousScreen() {
        navigate(NavigationCommand.Previous)
    }

    private fun goToNextScreen() {
        navigate(NavigationCommand.Next)
    }

    private fun enterFullscreenPlayer() {
        updateState { copy(isFullscreenMode = true) }
    }

    private fun exitFullscreenMode() {
        updateState { copy(isFullscreenMode = false) }
    }

    private suspend fun toggleFavorite() {
        val currentBundle = currentState.bundle ?: return
        runCatching {
            if (currentBundle.course.isFavorite) {
                catalogRepository.removeFavoriteCourse(currentBundle.course.id)
            } else {
                catalogRepository.addFavoriteCourse(currentBundle.course.id)
            }
        }.onSuccess { updatedCourse ->
            updateState {
                copy(bundle = currentBundle.copy(course = updatedCourse))
            }
            emitEffect(PlayerEffect.FavoriteChanged)
        }
    }

    private suspend fun createNote(content: String) {
        val lessonId = currentState.currentScreen?.lessonId ?: return
        val normalized = content.trim()
        if (normalized.isEmpty()) return
        runCatching {
            progressRepository.createNote(lessonId = lessonId, content = normalized)
        }.onSuccess {
            emitEffect(PlayerEffect.NoteCreated)
        }
    }

    private fun navigateToScreenKey(screenKey: String) {
        navigate(NavigationCommand.ToScreenKey(screenKey))
    }

    private fun navigate(command: NavigationCommand) {
        var completedLessonId: String? = null
        var completedCourseId: String? = null
        updateState {
            val currentBundle = bundle ?: return@updateState this
            val outcome = resolveNavigation(
                bundle = currentBundle,
                currentIndex = currentScreenIndex,
                completedScreens = completedScreens,
                command = command,
            ) ?: return@updateState this

            completedLessonId = resolveCompletedLessonId(
                bundle = currentBundle,
                sourceIndex = currentScreenIndex,
                targetIndex = outcome.targetIndex,
            )
            if (completedLessonId != null) {
                completedCourseId = currentBundle.course.id
            }

            copy(
                currentScreenIndex = outcome.targetIndex,
                completedScreens = outcome.completedScreens,
                activeHotspotHint = null,
            )
        }
        val lessonIdToSync = completedLessonId
        val courseIdToSync = completedCourseId
        if (lessonIdToSync != null && courseIdToSync != null) {
            syncCompletedLesson(lessonId = lessonIdToSync, courseId = courseIdToSync)
        }
        startSessionIfPossible()
        refreshProgressAndReference()
    }

    private fun onHotspotClick(hotspot: Hotspot) {
        when (val action = resolveHotspotAction(currentState.currentScreen?.payload, hotspot)) {
            HotspotAction.MoveNext -> goToNextScreen()
            is HotspotAction.ShowHint -> {
                currentLessonHintLevelMax = maxOf(currentLessonHintLevelMax, 1)
                updateState { copy(activeHotspotHint = action.hotspot) }
            }
            is HotspotAction.NavigateToScreen -> navigateToScreenKey(action.screenKey)
            HotspotAction.None -> Unit
        }
    }

    private fun dismissHotspotHint() {
        val hint = currentState.activeHotspotHint
        val currentPayload = currentState.currentScreen?.payload as? SimulationPayload

        updateState { copy(activeHotspotHint = null) }
        hint?.targetScreenKey?.let { screenKey ->
            if (currentPayload == null || hint in currentPayload.hotspots) {
                navigateToScreenKey(screenKey)
            }
        }
    }

    private fun closeCourse() {
        var trackedCompleted = false
        currentState.bundle?.let { bundle ->
            val completedLessonId = resolveCompletedLessonId.resolveOnClose(
                bundle = bundle,
                currentIndex = currentState.currentScreenIndex,
            )
            if (completedLessonId != null) {
                trackedCompleted = true
                syncCompletedLesson(lessonId = completedLessonId, courseId = bundle.course.id)
            } else {
                val currentLessonId = currentState.currentScreen?.lessonId
                if (currentLessonId != null) {
                    viewModelScope.launch {
                        runCatching {
                            trackLessonSession(
                                lessonId = currentLessonId,
                                courseId = bundle.course.id,
                                result = "abandoned",
                            )
                        }
                    }
                }
            }
        }
        if (trackedCompleted) {
            resetSessionTelemetry()
        }
        updateState { PlayerUiState(mediaAccessToken = mediaAccessToken) }
        emitEffect(PlayerEffect.Closed)
    }

    private fun restoreProgress(bundle: CatalogBundle): SavedCourseProgress {
        return restoreCourseProgress(
            bundle = bundle,
            saved = courseProgress[bundle.progressKey()],
        )
    }

    private fun persistCurrentProgress() {
        val state = currentState
        val bundle = state.bundle ?: return
        courseProgress[bundle.progressKey()] = SavedCourseProgress(
            currentScreenIndex = state.currentScreenIndex,
            completedScreens = state.completedScreens,
        )
    }

    private fun refreshProgressAndReference() {
        persistCurrentProgress()
        refreshCurrentMemoState()
    }

    private fun refreshCurrentMemoState() {
        val bundle = currentState.bundle
        val screen = currentState.currentScreen
        if (bundle == null || screen == null || screen.payload !is CheatSheetPayload) {
            if (currentState.currentMemoId != null || currentState.isCurrentMemoSaved) {
                updateState { copy(currentMemoId = null, isCurrentMemoSaved = false) }
            }
            return
        }
        val expectedScreenId = screen.id
        val releaseId = bundle.release.id
        viewModelScope.launch {
            val existing = runCatching {
                memoLocalStorage.findForScreen(
                    releaseId = releaseId,
                    screenId = expectedScreenId,
                )
            }.getOrNull()
            if (currentState.currentScreen?.id != expectedScreenId) return@launch
            updateState {
                copy(
                    currentMemoId = existing?.id,
                    isCurrentMemoSaved = existing != null,
                )
            }
        }
    }

    private suspend fun toggleMemoSaved() {
        val bundle = currentState.bundle ?: return
        val screen = currentState.currentScreen ?: return
        val payload = screen.payload as? CheatSheetPayload ?: return

        val existing = runCatching {
            memoLocalStorage.findForScreen(
                releaseId = bundle.release.id,
                screenId = screen.id,
            )
        }.getOrNull()

        if (existing != null) {
            runCatching { memoLocalStorage.delete(existing.id) }
                .onSuccess {
                    updateState { copy(currentMemoId = null, isCurrentMemoSaved = false) }
                    emitEffect(PlayerEffect.MemoRemoved)
                }
            return
        }

        val memo = SavedMemo(
            id = newMemoId(),
            title = screen.title.ifBlank { "Памятка" },
            contentHtml = payload.content,
            courseTitle = bundle.course.title,
            lessonTitle = resolveLessonTitle(bundle, screen),
            savedAtEpochMs = Clock.System.now().toEpochMilliseconds(),
            releaseId = bundle.release.id,
            screenId = screen.id,
            lessonId = screen.lessonId,
        )
        runCatching { memoLocalStorage.save(memo) }
            .onSuccess { saved ->
                updateState { copy(currentMemoId = saved.id, isCurrentMemoSaved = true) }
                emitEffect(PlayerEffect.MemoSaved)
            }
    }

    private fun resolveLessonTitle(bundle: CatalogBundle, screen: CatalogScreen): String {
        val lessonId = screen.lessonId ?: return ""
        return bundle.screens
            .firstOrNull { it.lessonId == lessonId && it.title.isNotBlank() }
            ?.title
            ?: ""
    }

    private fun newMemoId(): String {
        val millis = Clock.System.now().toEpochMilliseconds()
        val rnd = Random.nextInt(0, 999_999)
        return "memo_${millis}_$rnd"
    }

    private fun CatalogBundle.progressKey(): String = "${course.id}:${release.id}"

    private fun syncCompletedLesson(lessonId: String, courseId: String) {
        viewModelScope.launch {
            runCatching {
                progressRepository.upsertLessonProgress(
                    lessonId = lessonId,
                    status = "completed",
                )
                trackLessonSession(
                    lessonId = lessonId,
                    courseId = courseId,
                    result = "completed",
                )
            }
        }
    }

    private fun finishCurrentLesson() {
        val bundle = currentState.bundle ?: return
        val lessonId = currentState.currentScreen?.lessonId
        if (lessonId != null) {
            syncCompletedLesson(lessonId = lessonId, courseId = bundle.course.id)
        }
        updateState { copy(showLessonSummary = true) }
    }

    private fun returnToCourseDetails() {
        updateState {
            copy(
                isFullscreenMode = false,
                showLessonSummary = false,
                showCourseContents = false,
                courseDetailsRevision = courseDetailsRevision + 1,
            )
        }
    }

    private fun startSessionIfPossible() {
        if (currentState.currentScreen?.lessonId != null && currentLessonSessionStartedAt == null) {
            currentLessonSessionStartedAt = Clock.System.now().toString()
        }
    }

    private fun resetSessionTelemetry() {
        currentLessonSessionStartedAt = null
        currentLessonHintLevelMax = 0
        currentLessonErrorAttempts = 0
    }

    private fun recordSimulationError(hintLevel: Int) {
        currentLessonErrorAttempts += 1
        if (hintLevel > currentLessonHintLevelMax) {
            currentLessonHintLevelMax = hintLevel
        }
    }

    private suspend fun trackLessonSession(lessonId: String, courseId: String, result: String) {
        val payload = LessonSessionAnalyticsCreate(
            lessonId = lessonId,
            courseId = courseId,
            startedAt = currentLessonSessionStartedAt,
            finishedAt = Clock.System.now().toString(),
            errorAttempts = currentLessonErrorAttempts,
            hintLevelMax = currentLessonHintLevelMax,
            result = result,
        )
        progressRepository.trackLessonSession(payload)
        resetSessionTelemetry()
    }
}
