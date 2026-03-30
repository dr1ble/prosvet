package com.digitaledu.feature.player.impl.ui.player.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.content.ArticlePayload
import com.digitaledu.core.model.content.Hotspot
import com.digitaledu.core.model.content.QuizPayload
import com.digitaledu.core.model.content.SimulationPayload
import com.digitaledu.core.model.reference.LessonReference
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.impl.ui.player.PlayerContent
import digital_education_mobile.feature.player.`impl`.generated.resources.Res
import digital_education_mobile.feature.player.`impl`.generated.resources.close
import digital_education_mobile.feature.player.`impl`.generated.resources.theory
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.stringResource

/**
 * Stories-style pager for lesson content.
 *
 * Features:
 * - Segmented progress bar at the top
 * - Tap navigation (left/right zones)
 * - Deep Immersion mode for simulations (hides UI)
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun LessonStoriesPager(
    bundle: CatalogBundle,
    currentScreenIndex: Int,
    mediaAccessToken: String?,
    activeHotspotHint: Hotspot?,
    activeLessonReference: LessonReference?,
    onIntent: (PlayerIntent) -> Unit,
    onShowTheory: () -> Unit,
    resolveUrl: (String) -> String,
    modifier: Modifier = Modifier
) {
    val pagerState = rememberPagerState(
        initialPage = currentScreenIndex,
        pageCount = { bundle.screens.size }
    )
    val scope = rememberCoroutineScope()

    // Sync external state with internal pager state
    LaunchedEffect(currentScreenIndex) {
        if (pagerState.currentPage != currentScreenIndex) {
            pagerState.animateScrollToPage(currentScreenIndex)
        }
    }

    LaunchedEffect(pagerState.currentPage) {
        if (pagerState.currentPage != currentScreenIndex) {
            // Determine direction based on index difference
            if (pagerState.currentPage > currentScreenIndex) {
                onIntent(PlayerIntent.Next)
            } else {
                onIntent(PlayerIntent.Previous)
            }
        }
    }

    val currentScreen = bundle.screens.getOrNull(currentScreenIndex)
    val isSimulation = currentScreen?.payload is SimulationPayload

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Content Layer
        HorizontalPager(
            state = pagerState,
            userScrollEnabled = !isSimulation, // Disable swipe for simulations
            modifier = Modifier.fillMaxSize()
        ) { pageIndex ->
            val screen = bundle.screens.getOrNull(pageIndex)
            if (screen != null) {
                // Apply system bars padding only if NOT simulation
                val contentModifier = if (screen.payload is SimulationPayload) {
                    Modifier.fillMaxSize()
                } else {
                    Modifier
                        .fillMaxSize()
                        .systemBarsPadding() 
                        .padding(top = 24.dp) // Space for progress bar
                }
                
                PlayerContent(
                    screen = screen,
                    mediaAccessToken = mediaAccessToken,
                    activeHotspotHint = activeHotspotHint,
                    activeLessonReference = activeLessonReference,
                    onIntent = onIntent,
                    resolveUrl = resolveUrl,
                    modifier = contentModifier
                )
            }
        }

        // Overlay Navigation Controls (Tap Zones)
        // We only add this if it's NOT a simulation AND NOT an article AND NOT a quiz
        val isArticle = currentScreen?.payload is ArticlePayload
        val isQuiz = currentScreen?.payload is QuizPayload
        if (!isSimulation && !isArticle && !isQuiz) {
            Row(modifier = Modifier.fillMaxSize()) {
                // Left Zone (Previous)
                Box(
                    modifier = Modifier
                        .weight(0.3f)
                        .fillMaxSize()
                        .pointerInput(Unit) {
                            detectTapGestures(onTap = {
                                if (currentScreenIndex > 0) {
                                    onIntent(PlayerIntent.Previous)
                                }
                            })
                        }
                )
                
                // Center Zone (Pause/Menu - placeholder)
                Box(modifier = Modifier.weight(0.4f).fillMaxSize()) {
                    // Pass-through touches to content (e.g. scrolling text, video controls)
                }

                // Right Zone (Next)
                Box(
                    modifier = Modifier
                        .weight(0.3f)
                        .fillMaxSize()
                        .pointerInput(Unit) {
                            detectTapGestures(onTap = {
                                if (currentScreenIndex < bundle.screens.lastIndex) {
                                    onIntent(PlayerIntent.Next)
                                }
                            })
                        }
                )
            }
        }

        // UI Layer (Progress Bar & Controls)
        // Hidden during simulation ("Deep Immersion")
        if (!isSimulation) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .systemBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                // Top Layer Controls
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp), // Space below progress bar
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Theory / Reference Button (Left)
                    if (activeLessonReference != null) {
                        IconButton(
                            onClick = onShowTheory
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.Info,
                                contentDescription = stringResource(Res.string.theory),
                                tint = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    } else {
                        Spacer(modifier = Modifier.size(48.dp))
                    }

                    // Close Button (Right)
                    IconButton(
                        onClick = { onIntent(PlayerIntent.ExitFullscreen) }
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = stringResource(Res.string.close),
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                // Top Progress Bar (Aligned to top center, above controls)
                StoryStepsProgressBar(
                    stepsCount = bundle.screens.size,
                    currentStep = currentScreenIndex,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp)
                )
            }
        }
    }
}
