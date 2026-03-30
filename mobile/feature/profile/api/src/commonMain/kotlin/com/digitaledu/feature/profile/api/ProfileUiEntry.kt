package com.digitaledu.feature.profile.api

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

interface ProfileUiEntry {
    @Composable
    fun Content(
        uiState: ProfileUiState,
        onIntent: (ProfileIntent) -> Unit,
        modifier: Modifier = Modifier,
    )
}
