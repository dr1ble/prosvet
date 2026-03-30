package com.digitaledu.feature.player.impl.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.api.PlayerUiEntry
import com.digitaledu.feature.player.api.PlayerUiState
import com.digitaledu.feature.player.impl.ui.player.LessonPlayerScreen

internal class PlayerUiEntryImpl : PlayerUiEntry {
    override fun shouldShowFullscreen(uiState: PlayerUiState): Boolean {
        return uiState.isFullscreenMode && uiState.hasBundle
    }

    @Composable
    override fun FullscreenContent(
        uiState: PlayerUiState,
        onIntent: (PlayerIntent) -> Unit,
        resolveUrl: (String) -> String,
        modifier: Modifier,
    ) {
        val bundle = uiState.bundle ?: return
        LessonPlayerScreen(
            bundle = bundle,
            currentScreenIndex = uiState.currentScreenIndex,
            mediaAccessToken = uiState.mediaAccessToken,
            activeHotspotHint = uiState.activeHotspotHint,
            activeLessonReference = uiState.activeLessonReference,
            completedScreens = uiState.completedScreens,
            onIntent = onIntent,
            resolveUrl = resolveUrl,
            modifier = modifier,
        )
    }

    @Composable
    override fun TabContent(
        uiState: PlayerUiState,
        onIntent: (PlayerIntent) -> Unit,
        modifier: Modifier,
    ) {
        LessonContent(
            uiState = uiState,
            onIntent = onIntent,
            modifier = modifier,
        )
    }
}
