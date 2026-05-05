package com.digitaledu.feature.profile.api

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

interface ProfileUiEntry {
    @Composable
    fun Content(
        uiState: ProfileUiState,
        onIntent: (ProfileIntent) -> Unit,
        onOpenFavorites: () -> Unit = {},
        onOpenGlossary: () -> Unit = {},
        onOpenNotes: () -> Unit = {},
        modifier: Modifier = Modifier,
    )
}
