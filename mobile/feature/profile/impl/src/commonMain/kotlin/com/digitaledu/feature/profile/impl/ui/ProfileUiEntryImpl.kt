package com.digitaledu.feature.profile.impl.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.digitaledu.feature.profile.api.ProfileIntent
import com.digitaledu.feature.profile.api.ProfileUiEntry
import com.digitaledu.feature.profile.api.ProfileUiState

internal class ProfileUiEntryImpl : ProfileUiEntry {
    @Composable
    override fun Content(
        uiState: ProfileUiState,
        onIntent: (ProfileIntent) -> Unit,
        onOpenFavorites: () -> Unit,
        onOpenGlossary: () -> Unit,
        onOpenNotes: () -> Unit,
        modifier: Modifier,
    ) {
        ProfileContent(
            uiState = uiState,
            onIntent = onIntent,
            onOpenFavorites = onOpenFavorites,
            onOpenGlossary = onOpenGlossary,
            onOpenNotes = onOpenNotes,
            modifier = modifier,
        )
    }
}
