package com.digitaledu.feature.player.impl.presentation

import androidx.lifecycle.viewModelScope
import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.data.catalog.CatalogRepository
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
import com.digitaledu.feature.player.impl.domain.ResolveNavigationUseCase
import com.digitaledu.feature.player.impl.domain.RestoreCourseProgressUseCase
import com.digitaledu.feature.player.impl.domain.SavedCourseProgress
import com.digitaledu.feature.player.impl.domain.SimulationUrlResolver
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

internal class PlayerViewModel(
    private val urlResolver: SimulationUrlResolver,
    private val catalogRepository: CatalogRepository,
) : BaseViewModel<PlayerUiState, PlayerIntent, PlayerEffect>(PlayerUiState()), PlayerFeatureHost {

    private var referenceFetchJob: Job? = null
    private val courseProgress = mutableMapOf<String, SavedCourseProgress>()
    private val progressTransition = ProgressTransitionUseCase()
    private val restoreCourseProgress = RestoreCourseProgressUseCase()
    private val resolveReferenceId = ResolveReferenceIdUseCase()
    private val resolveNavigation = ResolveNavigationUseCase(progressTransition = progressTransition)
    private val resolveHotspotAction = ResolveHotspotActionUseCase()

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
        updateState {
            val currentBundle = bundle ?: return@updateState this
            val outcome = resolveNavigation(
                bundle = currentBundle,
                currentIndex = currentScreenIndex,
                completedScreens = completedScreens,
                command = command,
            ) ?: return@updateState this

            copy(
                currentScreenIndex = outcome.targetIndex,
                completedScreens = outcome.completedScreens,
            )
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
        updateState { PlayerUiState() }
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
}
