package com.digitaledu.feature.player.impl.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.api.PlayerUiEntry
import com.digitaledu.feature.player.api.PlayerUiState
import com.digitaledu.feature.player.impl.ui.player.LessonPlayerScreen
import com.digitaledu.feature.player.impl.ui.player.components.LessonSummaryView

internal class PlayerUiEntryImpl : PlayerUiEntry {
    override fun shouldShowFullscreen(uiState: PlayerUiState): Boolean {
        return uiState.isFullscreenMode && uiState.hasBundle
    }

    @Composable
    override fun FullscreenContent(
        uiState: PlayerUiState,
        onIntent: (PlayerIntent) -> Unit,
        onHelpClick: () -> Unit,
        resolveUrl: (String) -> String,
        modifier: Modifier,
    ) {
        val bundle = uiState.bundle ?: return

        if (uiState.showLessonSummary) {
            val summaryState = buildLessonSummaryState(
                course = bundle.course,
                screens = bundle.screens,
                currentScreenIndex = uiState.currentScreenIndex,
            )
            LessonSummaryView(
                state = summaryState,
                onContinue = { onIntent(PlayerIntent.Close) },
                onFinish = { onIntent(PlayerIntent.Close) },
                modifier = modifier,
            )
            return
        }

        LessonPlayerScreen(
            bundle = bundle,
            currentScreenIndex = uiState.currentScreenIndex,
            mediaAccessToken = uiState.mediaAccessToken,
            activeHotspotHint = uiState.activeHotspotHint,
            isCurrentMemoSaved = uiState.isCurrentMemoSaved,
            completedScreens = uiState.completedScreens,
            onIntent = onIntent,
            onHelpClick = onHelpClick,
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
