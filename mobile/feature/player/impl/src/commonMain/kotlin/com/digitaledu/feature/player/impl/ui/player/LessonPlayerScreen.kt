package com.digitaledu.feature.player.impl.ui.player

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import com.digitaledu.core.ui.util.BackHandler
import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.content.Hotspot
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.impl.ui.player.components.LessonStoriesPager

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun LessonPlayerScreen(
    bundle: CatalogBundle,
    currentScreenIndex: Int,
    mediaAccessToken: String?,
    activeHotspotHint: Hotspot?,
    isCurrentMemoSaved: Boolean,
    completedScreens: Set<Int> = emptySet(),
    onIntent: (PlayerIntent) -> Unit,
    onHelpClick: () -> Unit,
    resolveUrl: (String) -> String,
    modifier: Modifier = Modifier,
) {
    BackHandler {
        onIntent(PlayerIntent.ExitFullscreen)
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        LessonStoriesPager(
            bundle = bundle,
            currentScreenIndex = currentScreenIndex,
            mediaAccessToken = mediaAccessToken,
            activeHotspotHint = activeHotspotHint,
            isCurrentMemoSaved = isCurrentMemoSaved,
            onIntent = onIntent,
            onHelpClick = onHelpClick,
            resolveUrl = resolveUrl,
            modifier = Modifier.fillMaxSize()
        )
    }
}
