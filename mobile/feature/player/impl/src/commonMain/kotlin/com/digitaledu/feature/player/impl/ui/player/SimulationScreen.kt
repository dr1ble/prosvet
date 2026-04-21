package com.digitaledu.feature.player.impl.ui.player

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import coil3.compose.LocalPlatformContext
import coil3.compose.SubcomposeAsyncImage
import coil3.network.NetworkHeaders
import coil3.network.httpHeaders
import coil3.request.ImageRequest
import com.digitaledu.core.ui.components.UiOpacity
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.ui.components.accessibilityFocusHighlight
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.digitaledu.core.model.content.Hotspot
import com.digitaledu.core.model.content.SimulationPayload
import digital_education_mobile.feature.player.`impl`.generated.resources.Res
import digital_education_mobile.feature.player.`impl`.generated.resources.close
import digital_education_mobile.feature.player.`impl`.generated.resources.simulation_hint
import digital_education_mobile.feature.player.`impl`.generated.resources.simulation_load_error
import digital_education_mobile.feature.player.`impl`.generated.resources.simulation_screen_image
import kotlin.math.roundToInt
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
    payload: SimulationPayload,
    accessToken: String?,
    activeHotspotHint: Hotspot?,
    onResolveImageUrl: (String) -> String,
    onHotspotClick: (Hotspot) -> Unit,
    onDismissHint: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val platformContext = LocalPlatformContext.current
    var imageWidth by remember { mutableStateOf(0) }
    var imageHeight by remember { mutableStateOf(0) }
    
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
    
    Box(modifier = modifier.fillMaxSize()) {
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
                    onClick = { onHotspotClick(hotspot) },
                )
            }
        }
    }
    
    // Hint dialog
    activeHotspotHint?.let { hotspot ->
        AlertDialog(
            onDismissRequest = onDismissHint,
            title = {
                Text(text = hotspot.label.takeIf { it.isNotBlank() } ?: stringResource(Res.string.simulation_hint))
            },
            text = {
                Text(text = hotspot.hint)
            },
            confirmButton = {
                TextButton(onClick = onDismissHint) {
                    Text(stringResource(Res.string.close))
                }
            },
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
    
    // Convert percentages to pixels
    val xPx = (imageWidth * hotspot.x / 100f).roundToInt()
    val yPx = (imageHeight * hotspot.y / 100f).roundToInt()
    val widthPx = (imageWidth * hotspot.width / 100f).roundToInt()
    val heightPx = (imageHeight * hotspot.height / 100f).roundToInt()
    
    Box(
        modifier = Modifier
            .offset { IntOffset(xPx, yPx) }
            .size(
                width = with(density) { widthPx.toDp() },
                height = with(density) { heightPx.toDp() },
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
            .clickable(
                onClick = onClick,
                indication = ripple(),
                interactionSource = remember { MutableInteractionSource() },
            ),
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
