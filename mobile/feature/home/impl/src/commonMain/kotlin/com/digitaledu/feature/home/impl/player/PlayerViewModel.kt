package com.digitaledu.feature.home.impl.player

import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.Hotspot
import com.digitaledu.feature.home.impl.utils.SimulationUrlResolver

class PlayerViewModel(
    private val urlResolver: SimulationUrlResolver,
) : BaseViewModel<PlayerUiState, PlayerIntent, PlayerEffect>(PlayerUiState()) {

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
        updateState {
            copy(
                bundle = bundle,
                currentScreenIndex = 0,
                isFullscreenMode = false,
                completedScreens = emptySet(),
                activeHotspotHint = null,
            )
        }
    }

    fun resolveImageUrl(rawUrl: String): String = urlResolver.resolve(rawUrl)

    private fun goToPreviousScreen() {
        updateState {
            val nextIndex = (currentScreenIndex - 1).coerceAtLeast(0)
            copy(currentScreenIndex = nextIndex)
        }
    }

    private fun goToNextScreen() {
        updateState {
            val currentBundle = bundle ?: return@updateState this
            val nextIndex = (currentScreenIndex + 1).coerceIn(0, currentBundle.screens.lastIndex)
            val updatedCompleted = if (nextIndex > currentScreenIndex) {
                completedScreens + currentScreenIndex
            } else {
                completedScreens
            }
            copy(
                currentScreenIndex = nextIndex,
                completedScreens = updatedCompleted,
            )
        }
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
                copy(currentScreenIndex = targetIndex)
            } else {
                this
            }
        }
    }

    private fun onHotspotClick(hotspot: Hotspot) {
        if (hotspot.hint.isNotBlank()) {
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
}
