package com.digitaledu.feature.player.impl.ui.player

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import coil3.compose.LocalPlatformContext
import coil3.compose.SubcomposeAsyncImage
import coil3.network.NetworkHeaders
import coil3.network.httpHeaders
import coil3.request.ImageRequest
import com.digitaledu.core.ui.components.UiOpacity
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.ui.components.AccessibilityScaledControlContainer
import com.digitaledu.core.ui.components.accessibilityFocusHighlight
import com.digitaledu.core.ui.util.BackHandler
import com.digitaledu.core.ui.util.rememberErrorHapticFeedback
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.digitaledu.core.ui.components.accessibilityTremorFilteredClickable
import com.digitaledu.core.model.content.Hotspot
import com.digitaledu.core.model.content.SimulationPayload
import digital_education_mobile.feature.player.`impl`.generated.resources.Res
import digital_education_mobile.feature.player.`impl`.generated.resources.close
import digital_education_mobile.feature.player.`impl`.generated.resources.cyber_trainer_complete
import digital_education_mobile.feature.player.`impl`.generated.resources.cyber_trainer_progress
import digital_education_mobile.feature.player.`impl`.generated.resources.cyber_trainer_task
import digital_education_mobile.feature.player.`impl`.generated.resources.cyber_trainer_title
import digital_education_mobile.feature.player.`impl`.generated.resources.simulation_hint
import digital_education_mobile.feature.player.`impl`.generated.resources.simulation_load_error
import digital_education_mobile.feature.player.`impl`.generated.resources.simulation_screen_image
import org.jetbrains.compose.resources.stringResource



/**
 * Renders an interactive simulation screen with clickable hotspots.
 * 
 * Features:
 * - Loads and displays background image from server
 * - Renders hotspot zones as clickable overlays with visual feedback
 * - Shows hint dialogs when hotspots are clicked
 * - Navigates to target screen when hotspot has targetScreenKey
 * - Responsive layout that scales hotspots with image size
 */
@Composable
fun SimulationScreen(
    screenTitle: String,
    payload: SimulationPayload,
    isCurrentScreen: Boolean = true,
    accessToken: String?,
    activeHotspotHint: Hotspot?,
    onResolveImageUrl: (String) -> String,
    onHotspotClick: (Hotspot) -> Unit,
    onDismissHint: () -> Unit,
    onAutoAdvance: () -> Unit = {},
    onRecordError: (hintLevel: Int) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val platformContext = LocalPlatformContext.current
    var imageWidth by remember { mutableStateOf(0) }
    var imageHeight by remember { mutableStateOf(0) }
    val discoveredLabels = remember(payload) { mutableStateListOf<String>() }
    var wrongTapCount by remember(payload) { mutableStateOf(0) }
    val targetHotspot = payload.hotspots.firstOrNull()
    val performErrorHapticFeedback = rememberErrorHapticFeedback()
    val trainerState = buildCyberTrainerState(
        screenTitle = screenTitle,
        payload = payload,
        discoveredLabels = discoveredLabels.toSet(),
    )

    val isCompletionDeadEnd = payload.isCompletion && payload.hotspots.isEmpty() && isCurrentScreen
    
    val fullImageUrl = remember(payload.imageUrl, onResolveImageUrl) {
        onResolveImageUrl(payload.imageUrl)
    }
    
    val imageRequest = remember(platformContext, fullImageUrl, accessToken) {
        ImageRequest.Builder(platformContext)
            .data(fullImageUrl)
            .apply {
                if (!accessToken.isNullOrBlank()) {
                    httpHeaders(
                        NetworkHeaders.Builder()
                            .set("Authorization", "Bearer $accessToken")
                            .build(),
                    )
                }
            }
            .build()
    }
    
    BackHandler {
        if (payload.hotspots.isNotEmpty()) {
            return@BackHandler
        }
        onDismissHint()
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .accessibilityTremorFilteredClickable {
                if (payload.hotspots.isNotEmpty()) {
                    wrongTapCount += 1
                    val hintLevel = when {
                        wrongTapCount >= 3 -> 3
                        wrongTapCount == 2 -> 2
                        else -> 1
                    }
                    onRecordError(hintLevel)
                    if (wrongTapCount == 1) {
                        performErrorHapticFeedback()
                    }
                }
            }
    ) {
        // Background image
        SubcomposeAsyncImage(
            model = imageRequest,
            contentDescription = stringResource(Res.string.simulation_screen_image),
            modifier = Modifier
                .fillMaxWidth()
                .onGloballyPositioned { coordinates ->
                    imageWidth = coordinates.size.width
                    imageHeight = coordinates.size.height
                },
            contentScale = ContentScale.FillWidth,
            loading = {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            },
            error = {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.errorContainer),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = stringResource(Res.string.simulation_load_error),
                        color = MaterialTheme.colorScheme.onErrorContainer,
                    )
                }
            },
        )
        
        // Hotspot overlays
        if (imageWidth > 0 && imageHeight > 0) {
            payload.hotspots.forEach { hotspot ->
                HotspotOverlay(
                    hotspot = hotspot,
                    imageWidth = imageWidth,
                    imageHeight = imageHeight,
                    onClick = {
                        wrongTapCount = 0
                        val label = hotspot.label.trim()
                        if (label.isNotEmpty() && label !in discoveredLabels) {
                            discoveredLabels += label
                        }
                        onHotspotClick(hotspot)
                    },
                )
            }
        }

        if (wrongTapCount >= 2 && targetHotspot != null && imageWidth > 0 && imageHeight > 0) {
            AdaptiveTargetHighlight(
                hotspot = targetHotspot,
                imageWidth = imageWidth,
                imageHeight = imageHeight,
                showPointer = wrongTapCount >= 3,
            )
        }

        activeHotspotHint?.let { hotspot ->
            InlineSimulationHint(
                hotspot = hotspot,
                onDismiss = onDismissHint,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(UiSpacing.md),
            )
        }

        if (wrongTapCount >= 3 && targetHotspot != null && imageWidth > 0 && imageHeight > 0) {
            AnimatedArrowPointer(
                hotspot = targetHotspot,
                imageWidth = imageWidth,
                imageHeight = imageHeight,
            )
        } else if (isCompletionDeadEnd) {
            CompletionBanner(
                onContinue = onAutoAdvance,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(UiSpacing.md),
            )
        } else if (trainerState.isEnabled) {
            CyberTrainerPanel(
                state = trainerState,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(UiSpacing.md),
            )
        }
    }
}

@Composable
private fun CompletionBanner(
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = UiShapes.cardLg,
        color = MaterialTheme.colorScheme.surfaceContainerLowest,
        tonalElevation = 6.dp,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.md),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "Это последний экран",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.weight(1f),
            )
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .clip(UiShapes.pill)
                    .background(MaterialTheme.colorScheme.primary)
                    .accessibilityTouchTarget
                    .accessibilitySemantics(
                        label = "Продолжить",
                        role = Role.Button,
                    )
                    .accessibilityTremorFilteredClickable(onClick = onContinue)
                    .padding(horizontal = UiSpacing.md, vertical = UiSpacing.xs),
            ) {
                Text(
                    text = "Продолжить",
                    style = MaterialTheme.typography.labelLarge,
                    color = Color.White,
                )
            }
        }
    }
}

@Composable
private fun CyberTrainerPanel(
    state: CyberTrainerState,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = UiShapes.cardLg,
        color = MaterialTheme.colorScheme.surfaceContainerLowest,
        tonalElevation = 6.dp,
    ) {
        Column(
            modifier = Modifier.padding(UiSpacing.md),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(UiSpacing.xxs)) {
                    Text(
                        text = stringResource(Res.string.cyber_trainer_title),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Text(
                        text = if (state.isComplete) {
                            stringResource(Res.string.cyber_trainer_complete)
                        } else {
                            stringResource(Res.string.cyber_trainer_task)
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    text = stringResource(
                        Res.string.cyber_trainer_progress,
                        state.discoveredSignals,
                        state.totalSignals,
                    ),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
            LinearProgressIndicator(
                progress = { state.progressPercent / 100f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(UiShapes.pill),
            )
        }
    }
}

@Composable
private fun InlineSimulationHint(
    hotspot: Hotspot,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = UiShapes.cardLg,
        color = MaterialTheme.colorScheme.surfaceContainerLowest,
        tonalElevation = 6.dp,
    ) {
        Column(
            modifier = Modifier.padding(UiSpacing.md),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
        ) {
            Text(
                text = hotspot.label.takeIf { it.isNotBlank() } ?: stringResource(Res.string.simulation_hint),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = hotspot.hint.takeIf { it.isNotBlank() }
                    ?: "Нажмите «Закрыть», чтобы перейти дальше.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = stringResource(Res.string.close),
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .align(Alignment.End)
                    .accessibilityTouchTarget
                    .accessibilitySemantics(label = stringResource(Res.string.close), role = Role.Button)
                    .accessibilityTremorFilteredClickable(onClick = onDismiss),
            )
        }
    }
}

@Composable
private fun AdaptiveTargetHighlight(
    hotspot: Hotspot,
    imageWidth: Int,
    imageHeight: Int,
    showPointer: Boolean,
) {
    val density = LocalDensity.current
    val bounds = calculateHotspotBounds(
        hotspot = hotspot,
        imageWidth = imageWidth,
        imageHeight = imageHeight,
    )

    Box(
        modifier = Modifier
            .offset { IntOffset(bounds.x, bounds.y) }
            .size(
                width = with(density) { bounds.width.toDp() },
                height = with(density) { bounds.height.toDp() },
            )
            .border(
                width = if (showPointer) 4.dp else 3.dp,
                color = if (showPointer) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.secondary,
                shape = UiShapes.cardSm,
            )
            .background(
                color = if (showPointer) {
                    MaterialTheme.colorScheme.tertiary.copy(alpha = UiOpacity.medium)
                } else {
                    MaterialTheme.colorScheme.secondary.copy(alpha = UiOpacity.medium)
                },
                shape = UiShapes.cardSm,
            ),
    )
}

@Composable
private fun AnimatedArrowPointer(
    hotspot: Hotspot,
    imageWidth: Int,
    imageHeight: Int,
) {
    val density = LocalDensity.current
    val bounds = calculateHotspotBounds(
        hotspot = hotspot,
        imageWidth = imageWidth,
        imageHeight = imageHeight,
    )

    val infiniteTransition = rememberInfiniteTransition(label = "arrow-pointer")
    val bounce by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 18f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 650, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "arrow-bounce",
    )
    val pulse by infiniteTransition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 650, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "arrow-pulse",
    )

    // Arrow is drawn just above the target hotspot, pointing down at it.
    val arrowWidthDp = 64.dp
    val arrowHeightDp = 64.dp
    val arrowWidthPx = with(density) { arrowWidthDp.toPx() }
    val arrowHeightPx = with(density) { arrowHeightDp.toPx() }
    val centerX = bounds.x + bounds.width / 2f
    val targetTopY = bounds.y.toFloat()

    // Position the arrow above the hotspot; if the hotspot is near the top of
    // the image, fall back to placing it below so it stays visible on screen.
    val preferAbove = targetTopY - arrowHeightPx - bounce - 12f > 0f
    val baseX = (centerX - arrowWidthPx / 2f).toInt()
    val baseY = if (preferAbove) {
        (targetTopY - arrowHeightPx - 12f - bounce).toInt()
    } else {
        (bounds.y + bounds.height + 12f + bounce).toInt()
    }

    Box(
        modifier = Modifier
            .offset { IntOffset(baseX, baseY) }
            .size(width = arrowWidthDp, height = arrowHeightDp)
            .graphicsLayer {
                scaleX = pulse
                scaleY = pulse
                rotationZ = if (preferAbove) 0f else 180f
            }
            .background(
                color = MaterialTheme.colorScheme.tertiary.copy(alpha = UiOpacity.strong),
                shape = UiShapes.cardSm,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.Filled.ArrowDownward,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onTertiary,
            modifier = Modifier.size(36.dp),
        )
    }
}

/**
 * Renders a single clickable hotspot overlay.
 * 
 * The hotspot uses percentage-based coordinates (0-100) relative to the image dimensions.
 */
@Composable
private fun HotspotOverlay(
    hotspot: Hotspot,
    imageWidth: Int,
    imageHeight: Int,
    onClick: () -> Unit,
) {
    val density = LocalDensity.current
    val bounds = calculateHotspotBounds(
        hotspot = hotspot,
        imageWidth = imageWidth,
        imageHeight = imageHeight,
    )

    Box(
        modifier = Modifier
            .offset { IntOffset(bounds.x, bounds.y) }
            .size(
                width = with(density) { bounds.width.toDp() },
                height = with(density) { bounds.height.toDp() },
            )
            .clip(UiShapes.cardSm)
            .background(MaterialTheme.colorScheme.primary.copy(alpha = UiOpacity.medium))
            .border(
                width = 2.dp,
                color = MaterialTheme.colorScheme.primary.copy(alpha = UiOpacity.strong),
                shape = UiShapes.cardSm,
            )
            .accessibilityTouchTarget
            .accessibilitySemantics(
                label = hotspot.label.takeIf { it.isNotBlank() } ?: hotspot.hint,
                state = if (hotspot.targetScreenKey != null) "открывает следующий экран" else "показывает подсказку",
                role = Role.Button,
            )
            .accessibilityFocusHighlight(shape = UiShapes.cardSm, color = MaterialTheme.colorScheme.secondary)
            .accessibilityTremorFilteredClickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        // Optional: show label inside hotspot
        if (hotspot.label.isNotBlank()) {
            Text(
                text = hotspot.label,
                color = MaterialTheme.colorScheme.onPrimary,
                style = MaterialTheme.typography.labelSmall,
                modifier = Modifier
                    .background(
                        color = MaterialTheme.colorScheme.scrim.copy(alpha = UiOpacity.strong),
                        shape = UiShapes.chip,
                    )
                    .clip(UiShapes.chip)
                    .padding(horizontal = UiSpacing.xs, vertical = UiSpacing.xxs),
            )
        }
    }
}
