package com.digitaledu.feature.player.impl.ui.player.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.rounded.SupportAgent
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.Role
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.ui.components.AccessibilityScaledControlContainer
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.digitaledu.core.ui.components.rememberTremorFilteredOnClick
import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.content.ArticlePayload
import com.digitaledu.core.model.content.Hotspot
import com.digitaledu.core.model.content.QuizPayload
import com.digitaledu.core.model.content.SimulationPayload
import com.digitaledu.core.model.content.VideoPayload
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.impl.ui.player.PlayerContent
import digital_education_mobile.feature.player.`impl`.generated.resources.Res
import digital_education_mobile.feature.player.`impl`.generated.resources.close
import digital_education_mobile.feature.player.`impl`.generated.resources.help
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
    isCurrentMemoSaved: Boolean,
    onIntent: (PlayerIntent) -> Unit,
    onHelpClick: () -> Unit,
    resolveUrl: (String) -> String,
    modifier: Modifier = Modifier
) {
    val pagerState = rememberPagerState(
        initialPage = currentScreenIndex,
        pageCount = { bundle.screens.size }
    )
    val currentScreen = bundle.screens.getOrNull(currentScreenIndex)
    val isSimulation = currentScreen?.payload is SimulationPayload
    val isVideo = currentScreen?.payload is VideoPayload

    LaunchedEffect(currentScreenIndex) {
        if (pagerState.currentPage != currentScreenIndex) {
            pagerState.animateScrollToPage(currentScreenIndex)
        }
    }

    LaunchedEffect(pagerState.settledPage, isSimulation) {
        if (isSimulation) return@LaunchedEffect
        if (pagerState.settledPage != currentScreenIndex) {
            if (pagerState.settledPage > currentScreenIndex) {
                onIntent(PlayerIntent.Next)
            } else {
                onIntent(PlayerIntent.Previous)
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
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
                        .padding(top = UiSpacing.xl)
                }

                PlayerContent(
                    screen = screen,
                    mediaAccessToken = mediaAccessToken,
                    activeHotspotHint = activeHotspotHint,
                    isCurrentMemoSaved = isCurrentMemoSaved,
                    isCurrentScreen = pageIndex == currentScreenIndex,
                    onIntent = onIntent,
                    resolveUrl = resolveUrl,
                    modifier = contentModifier,
                )
            }
        }

        val isArticle = currentScreen?.payload is ArticlePayload
        val isQuiz = currentScreen?.payload is QuizPayload
        if (!isSimulation && !isArticle && !isQuiz) {
            val edgeZoneWeight = if (isVideo) 0.18f else 0.3f
            val centerZoneWeight = 1f - (edgeZoneWeight * 2)
            Row(modifier = Modifier.fillMaxSize()) {
                Box(
                    modifier = Modifier
                        .weight(edgeZoneWeight)
                        .fillMaxSize()
                        .pointerInput(Unit) {
                            detectTapGestures(onTap = {
                                if (currentScreenIndex > 0) {
                                    onIntent(PlayerIntent.Previous)
                                }
                            })
                        }
                )
                
                Box(modifier = Modifier.weight(centerZoneWeight).fillMaxSize())

                Box(
                    modifier = Modifier
                        .weight(edgeZoneWeight)
                        .fillMaxSize()
                        .pointerInput(Unit) {
                            detectTapGestures(onTap = {
                                onIntent(PlayerIntent.Next)
                            })
                        }
                )
            }
        }

        if (!isSimulation) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .systemBarsPadding()
                    .padding(horizontal = UiSpacing.md, vertical = UiSpacing.xs)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = UiSpacing.md),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(
                            onClick = rememberTremorFilteredOnClick(onClick = onHelpClick),
                            modifier = Modifier
                                .accessibilityTouchTarget
                                .accessibilitySemantics(
                                    label = stringResource(Res.string.help),
                                    role = Role.Button,
                                ),
                        ) {
                            AccessibilityScaledControlContainer {
                                Icon(
                                    imageVector = Icons.Rounded.SupportAgent,
                                    contentDescription = stringResource(Res.string.help),
                                    tint = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }

                        IconButton(
                            onClick = rememberTremorFilteredOnClick { onIntent(PlayerIntent.ExitFullscreen) },
                            modifier = Modifier
                                .accessibilityTouchTarget
                                .accessibilitySemantics(
                                    label = stringResource(Res.string.close),
                                    role = Role.Button,
                                ),
                        ) {
                            AccessibilityScaledControlContainer {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = stringResource(Res.string.close),
                                    tint = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }

                StoryStepsProgressBar(
                    stepsCount = bundle.screens.size,
                    currentStep = currentScreenIndex,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = UiSpacing.xs)
                )
            }
        }
    }
}
