package com.digitaledu.feature.player.impl.presentation

import androidx.lifecycle.viewModelScope
import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.data.catalog.CatalogRepository
import com.digitaledu.core.data.progress.ProgressRepository
import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.content.Hotspot
import com.digitaledu.core.model.content.ScreenPayload
import com.digitaledu.feature.player.api.PlayerEffect
import com.digitaledu.feature.player.api.PlayerFeatureHost
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.api.PlayerUiState
import com.digitaledu.feature.player.impl.domain.HotspotAction
import com.digitaledu.feature.player.impl.domain.NavigationCommand
import com.digitaledu.feature.player.impl.domain.ProgressTransitionUseCase
import com.digitaledu.feature.player.impl.domain.ResolveReferenceIdUseCase
import com.digitaledu.feature.player.impl.domain.ResolveHotspotActionUseCase
import com.digitaledu.feature.player.impl.domain.ResolveCompletedLessonIdUseCase
import com.digitaledu.feature.player.impl.domain.ResolveNavigationUseCase
import com.digitaledu.feature.player.impl.domain.RestoreCourseProgressUseCase
import com.digitaledu.feature.player.impl.domain.SavedCourseProgress
import com.digitaledu.feature.player.impl.domain.SimulationUrlResolver
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

internal class PlayerViewModel(
    private val urlResolver: SimulationUrlResolver,
    private val catalogRepository: CatalogRepository,
    private val authRepository: AuthRepository,
    private val progressRepository: ProgressRepository,
) : BaseViewModel<PlayerUiState, PlayerIntent, PlayerEffect>(PlayerUiState()), PlayerFeatureHost {

    private var referenceFetchJob: Job? = null
    private val courseProgress = mutableMapOf<String, SavedCourseProgress>()
    private val progressTransition = ProgressTransitionUseCase()
    private val restoreCourseProgress = RestoreCourseProgressUseCase()
    private val resolveReferenceId = ResolveReferenceIdUseCase()
    private val resolveNavigation = ResolveNavigationUseCase(progressTransition = progressTransition)
    private val resolveCompletedLessonId = ResolveCompletedLessonIdUseCase()
    private val resolveHotspotAction = ResolveHotspotActionUseCase()

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
            PlayerIntent.Close -> closeCourse()
        }
    }

    override fun openBundle(bundle: CatalogBundle) {
        val restoredProgress = restoreProgress(bundle)
        updateState {
            copy(
                bundle = bundle,
                currentScreenIndex = restoredProgress.currentScreenIndex,
                isFullscreenMode = true,
                mediaAccessToken = mediaAccessToken,
                completedScreens = restoredProgress.completedScreens,
                activeHotspotHint = null,
            )
        }
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

    private fun navigateToScreenKey(screenKey: String) {
        navigate(NavigationCommand.ToScreenKey(screenKey))
    }

    private fun navigate(command: NavigationCommand) {
        var completedLessonId: String? = null
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

            copy(
                currentScreenIndex = outcome.targetIndex,
                completedScreens = outcome.completedScreens,
            )
        }
        val lessonIdToSync = completedLessonId
        if (lessonIdToSync != null) {
            syncCompletedLesson(lessonIdToSync)
        }
        refreshProgressAndReference()
    }

    private fun onHotspotClick(hotspot: Hotspot) {
        when (val action = resolveHotspotAction(currentState.currentScreen?.payload, hotspot)) {
            HotspotAction.MoveNext -> goToNextScreen()
            is HotspotAction.ShowHint -> updateState { copy(activeHotspotHint = action.hotspot) }
            is HotspotAction.NavigateToScreen -> navigateToScreenKey(action.screenKey)
            HotspotAction.None -> Unit
        }
    }

    private fun dismissHotspotHint() {
        val hint = currentState.activeHotspotHint
        updateState { copy(activeHotspotHint = null) }
        hint?.targetScreenKey?.let { navigateToScreenKey(it) }
    }

    private fun closeCourse() {
        currentState.bundle?.let { bundle ->
            val completedLessonId = resolveCompletedLessonId.resolveOnClose(
                bundle = bundle,
                currentIndex = currentState.currentScreenIndex,
            )
            if (completedLessonId != null) {
                syncCompletedLesson(completedLessonId)
            }
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
        currentState.currentScreen?.payload?.let(::loadLessonReference)
    }

    private fun CatalogBundle.progressKey(): String = "${course.id}:${release.id}"

    private fun loadLessonReference(screenPayload: ScreenPayload) {
        referenceFetchJob?.cancel()

        val referenceId = resolveReferenceId(screenPayload)
        if (referenceId == null) {
            clearActiveLessonReference()
            return
        }

        referenceFetchJob = viewModelScope.launch {
            runCatching {
                catalogRepository.getLessonReference(referenceId)
            }.onSuccess { reference ->
                updateState { copy(activeLessonReference = reference) }
            }.onFailure {
                clearActiveLessonReference()
            }
        }
    }

    private fun clearActiveLessonReference() {
        updateState { copy(activeLessonReference = null) }
    }

    private fun syncCompletedLesson(lessonId: String) {
        viewModelScope.launch {
            runCatching {
                progressRepository.upsertLessonProgress(
                    lessonId = lessonId,
                    status = "completed",
                )
            }
        }
    }
}
