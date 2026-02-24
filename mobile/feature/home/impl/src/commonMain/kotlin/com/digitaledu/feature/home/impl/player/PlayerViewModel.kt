package com.digitaledu.feature.home.impl.player

import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.Hotspot
import com.digitaledu.feature.home.impl.utils.SimulationUrlResolver
import androidx.lifecycle.viewModelScope
import com.digitaledu.core.data.catalog.CatalogRepository
import com.digitaledu.core.model.ScreenPayload
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class PlayerViewModel(
    private val urlResolver: SimulationUrlResolver,
    private val catalogRepository: CatalogRepository,
) : BaseViewModel<PlayerUiState, PlayerIntent, PlayerEffect>(PlayerUiState()) {

    private var referenceFetchJob: Job? = null
    private val courseProgress = mutableMapOf<String, SavedCourseProgress>()

    private data class SavedCourseProgress(
        val currentScreenIndex: Int,
        val completedScreens: Set<Int>,
    )


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

    fun openBundle(bundle: CatalogBundle) {
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

    fun resolveImageUrl(rawUrl: String): String = urlResolver.resolve(rawUrl)

    private fun goToPreviousScreen() {
        updateState {
            val nextIndex = (currentScreenIndex - 1).coerceAtLeast(0)
            copy(currentScreenIndex = nextIndex)
        }
        refreshProgressAndReference()
    }

    private fun goToNextScreen() {
        updateState {
            val currentBundle = bundle ?: return@updateState this
            val nextIndex = (currentScreenIndex + 1).coerceIn(0, currentBundle.screens.lastIndex)
            copy(
                currentScreenIndex = nextIndex,
                completedScreens = markCompletedIfMovedForward(
                    sourceIndex = currentScreenIndex,
                    targetIndex = nextIndex,
                    completedScreens = completedScreens,
                ),
            )
        }
        refreshProgressAndReference()
    }

    private fun enterFullscreenPlayer() {
        updateState { copy(isFullscreenMode = true) }
    }

    private fun exitFullscreenMode() {
        updateState { copy(isFullscreenMode = false) }
    }

    private fun navigateToScreenKey(screenKey: String) {
        updateState {
            val currentBundle = bundle ?: return@updateState this
            val targetIndex = currentBundle.screens.indexOfFirst { it.screenKey == screenKey }
            if (targetIndex >= 0) {
                copy(
                    currentScreenIndex = targetIndex,
                    completedScreens = markCompletedIfMovedForward(
                        sourceIndex = currentScreenIndex,
                        targetIndex = targetIndex,
                        completedScreens = completedScreens,
                    ),
                )
            } else {
                this
            }
        }
        refreshProgressAndReference()
    }

    private fun onHotspotClick(hotspot: Hotspot) {
        val currentPayload = currentState.currentScreen?.payload
        val isStartSimulation = (currentPayload as? ScreenPayload.Simulation)?.isStart == true

        // If it's a start screen and the hotspot has NO explicit target, treat it as "Next"
        if (isStartSimulation && hotspot.targetScreenKey == null) {
            goToNextScreen()
        } else if (hotspot.hint.isNotBlank()) {
            updateState { copy(activeHotspotHint = hotspot) }
        } else {
            hotspot.targetScreenKey?.let { navigateToScreenKey(it) }
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
        val saved = courseProgress[bundle.progressKey()] ?: return SavedCourseProgress(
            currentScreenIndex = 0,
            completedScreens = emptySet(),
        )
        val lastIndex = bundle.screens.lastIndex.coerceAtLeast(0)
        val restoredIndex = saved.currentScreenIndex.coerceIn(0, lastIndex)
        val validCompleted = saved.completedScreens.filterTo(mutableSetOf()) { it in 0..lastIndex }
        return SavedCourseProgress(
            currentScreenIndex = restoredIndex,
            completedScreens = validCompleted,
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

    private fun markCompletedIfMovedForward(
        sourceIndex: Int,
        targetIndex: Int,
        completedScreens: Set<Int>,
    ): Set<Int> {
        return if (targetIndex > sourceIndex) {
            completedScreens + sourceIndex
        } else {
            completedScreens
        }
    }

    private fun refreshProgressAndReference() {
        persistCurrentProgress()
        currentState.currentScreen?.payload?.let(::loadLessonReference)
    }

    private fun CatalogBundle.progressKey(): String = "${course.id}:${release.id}"

    private fun loadLessonReference(screenPayload: ScreenPayload) {
        referenceFetchJob?.cancel()

        val referenceId = screenPayload.referenceIdOrNull()
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
                // Error is ignored for now as it's auxiliary content
                clearActiveLessonReference()
            }
        }
    }

    private fun clearActiveLessonReference() {
        updateState { copy(activeLessonReference = null) }
    }

    private fun ScreenPayload.referenceIdOrNull(): String? {
        return when (this) {
            is ScreenPayload.Simulation -> contextRef
            is ScreenPayload.CheatSheet -> referenceId
            else -> null
        }
    }
}
