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
import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.content.ArticlePayload
import com.digitaledu.core.model.content.CheatSheetPayload
import com.digitaledu.core.model.content.Hotspot
import com.digitaledu.core.model.content.QuizPayload
import com.digitaledu.core.model.content.SimulationPayload
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.impl.ui.buildLessonSummaryState
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
    val isSummaryScreen = currentScreenIndex == bundle.screens.lastIndex &&
        (currentScreen?.payload is ArticlePayload || currentScreen?.payload is CheatSheetPayload)
    val isSimulation = currentScreen?.payload is SimulationPayload && !isSummaryScreen

    LaunchedEffect(currentScreenIndex) {
        if (pagerState.currentPage != currentScreenIndex) {
            pagerState.animateScrollToPage(currentScreenIndex)
        }
    }

    LaunchedEffect(pagerState.currentPage, isSimulation) {
        // Feed pager swipes back into the VM only for screens where user-driven
        // navigation is allowed. Simulation screens disable swipe entirely, so
        // any currentPage drift there would be an unintended side-effect we
        // don't want to forward (it used to cause ghost auto-advance).
        if (isSimulation) return@LaunchedEffect
        if (pagerState.currentPage != currentScreenIndex) {
            if (pagerState.currentPage > currentScreenIndex) {
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
                val isPageSummary = pageIndex == bundle.screens.lastIndex &&
                    (screen.payload is ArticlePayload || screen.payload is CheatSheetPayload)
                // Apply system bars padding only if NOT simulation
                val contentModifier = if (screen.payload is SimulationPayload) {
                    Modifier.fillMaxSize()
                } else {
                    Modifier
                        .fillMaxSize()
                        .systemBarsPadding() 
                        .padding(top = UiSpacing.xl)
                }

                if (isPageSummary) {
                    LessonSummaryView(
                        state = buildLessonSummaryState(
                            course = bundle.course,
                            screens = bundle.screens,
                            currentScreenIndex = pageIndex,
                        ),
                        onContinue = { onIntent(PlayerIntent.Next) },
                        onFinish = { onIntent(PlayerIntent.ExitFullscreen) },
                        modifier = contentModifier,
                    )
                } else {
                    PlayerContent(
                        screen = screen,
                        mediaAccessToken = mediaAccessToken,
                        activeHotspotHint = activeHotspotHint,
                        isCurrentMemoSaved = isCurrentMemoSaved,
                        onIntent = onIntent,
                        resolveUrl = resolveUrl,
                        modifier = contentModifier,
                    )
                }
            }
        }

        val isArticle = currentScreen?.payload is ArticlePayload
        val isQuiz = currentScreen?.payload is QuizPayload
        if (!isSimulation && !isArticle && !isQuiz) {
            Row(modifier = Modifier.fillMaxSize()) {
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
                
                Box(modifier = Modifier.weight(0.4f).fillMaxSize())

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
                            onClick = onHelpClick,
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
                            onClick = { onIntent(PlayerIntent.ExitFullscreen) },
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
