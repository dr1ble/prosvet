package com.digitaledu.feature.player.api

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

interface PlayerUiEntry {
    fun shouldShowFullscreen(uiState: PlayerUiState): Boolean

    @Composable
    fun FullscreenContent(
        uiState: PlayerUiState,
        onIntent: (PlayerIntent) -> Unit,
        onHelpClick: () -> Unit,
        resolveUrl: (String) -> String,
        modifier: Modifier = Modifier,
    )

    @Composable
    fun TabContent(
        uiState: PlayerUiState,
        onIntent: (PlayerIntent) -> Unit,
        modifier: Modifier = Modifier,
    )
}
