package com.digitaledu.feature.home.impl.ui.player

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import com.digitaledu.core.ui.util.BackHandler
import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.Hotspot
import com.digitaledu.core.model.LessonReference
import com.digitaledu.feature.home.impl.player.PlayerIntent
import com.digitaledu.feature.home.impl.ui.player.components.LessonCheatSheetView
import com.digitaledu.feature.home.impl.ui.player.components.LessonStoriesPager

/**
 * Fullscreen lesson player screen implementing the "Stories" design pattern.
 *
 * delegates the main UI logic to [LessonStoriesPager] which handles:
 * - Horizontal navigation (Tap/Swipe)
 * - Deep Immersion for simulations
 * - Progress visualization
 */
@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun LessonPlayerScreen(
    bundle: CatalogBundle,
    currentScreenIndex: Int,
    mediaAccessToken: String?,
    activeHotspotHint: Hotspot?,
    activeLessonReference: LessonReference?,
    completedScreens: Set<Int> = emptySet(), // Kept for API compatibility, though visual progress is step-based
    onIntent: (PlayerIntent) -> Unit,
    resolveUrl: (String) -> String,
    modifier: Modifier = Modifier,
) {
    // Bottom Sheet State for Theory/CheatSheet logic
    @OptIn(ExperimentalMaterial3Api::class)
    val sheetState = rememberModalBottomSheetState()
    var showTheorySheet by remember { mutableStateOf(false) }
    
    // Intercept back gesture to close player instead of app
    BackHandler {
        onIntent(PlayerIntent.ExitFullscreen)
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Main Stories Pager
        LessonStoriesPager(
            bundle = bundle,
            currentScreenIndex = currentScreenIndex,
            mediaAccessToken = mediaAccessToken,
            activeHotspotHint = activeHotspotHint,
            activeLessonReference = activeLessonReference,
            onIntent = onIntent,
            onShowTheory = { showTheorySheet = true },
            resolveUrl = resolveUrl,
            modifier = Modifier.fillMaxSize()
        )

        // Theory Bottom Sheet
        if (showTheorySheet) {
            @OptIn(ExperimentalMaterial3Api::class)
            ModalBottomSheet(
                onDismissRequest = { showTheorySheet = false },
                sheetState = sheetState
            ) {
                activeLessonReference?.let { reference ->
                    LessonCheatSheetView(
                        reference = reference
                    )
                } ?: run {
                     // Fallback if no reference is active (should not happen given button logic)
                }
            }
        }
    }
}
