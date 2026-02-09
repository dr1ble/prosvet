package com.digitaledu.feature.home.impl.ui.player

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import coil3.compose.LocalPlatformContext
import coil3.compose.SubcomposeAsyncImage
import coil3.network.NetworkHeaders
import coil3.network.httpHeaders
import coil3.request.ImageRequest
import com.digitaledu.core.model.Hotspot
import com.digitaledu.core.model.ScreenPayload
import kotlin.math.roundToInt

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
    payload: ScreenPayload.Simulation,
    baseUrl: String,
    accessToken: String?,
    onNavigateToScreen: (screenKey: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val platformContext = LocalPlatformContext.current
    var showingHint by remember { mutableStateOf<Hotspot?>(null) }
    var imageWidth by remember { mutableStateOf(0) }
    var imageHeight by remember { mutableStateOf(0) }
    
    val fullImageUrl = remember(baseUrl, payload.imageUrl) {
        resolveSimulationImageUrl(
            baseUrl = baseUrl,
            rawImageUrl = payload.imageUrl,
        )
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
            contentDescription = "Simulation screen image",
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
                        text = "Не удалось загрузить изображение",
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
                        // Show hint first if available
                        if (hotspot.hint.isNotBlank()) {
                            showingHint = hotspot
                        }
                        // Navigate if target is set
                        hotspot.targetScreenKey?.let { targetKey ->
                            onNavigateToScreen(targetKey)
                        }
                    },
                )
            }
        }
    }
    
    // Hint dialog
    showingHint?.let { hotspot ->
        AlertDialog(
            onDismissRequest = { showingHint = null },
            title = {
                Text(text = hotspot.label.takeIf { it.isNotBlank() } ?: "Подсказка")
            },
            text = {
                Text(text = hotspot.hint)
            },
            confirmButton = {
                TextButton(onClick = { showingHint = null }) {
                    Text("Закрыть")
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
            .clip(RoundedCornerShape(8.dp))
            .background(Color.Blue.copy(alpha = 0.2f))
            .border(
                width = 2.dp,
                color = Color.Blue.copy(alpha = 0.6f),
                shape = RoundedCornerShape(8.dp),
            )
            .clickable(
                onClick = onClick,
                indication = androidx.compose.material3.ripple(),
                interactionSource = remember { MutableInteractionSource() },
            ),
        contentAlignment = Alignment.Center,
    ) {
        // Optional: show label inside hotspot
        if (hotspot.label.isNotBlank()) {
            Text(
                text = hotspot.label,
                color = Color.White,
                style = MaterialTheme.typography.labelSmall,
                modifier = Modifier
                    .background(
                        color = Color.Black.copy(alpha = 0.6f),
                        shape = RoundedCornerShape(4.dp),
                    )
                    .clip(RoundedCornerShape(4.dp)),
            )
        }
    }
}

private fun resolveSimulationImageUrl(
    baseUrl: String,
    rawImageUrl: String,
): String {
    val imageUrl = rawImageUrl.trim()
    val baseOrigin = extractOrigin(baseUrl)
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        val absolutePathAndQuery = extractPathAndQuery(imageUrl)
        val normalizedPathAndQuery = normalizeSimulationPath(absolutePathAndQuery)
        val origin = if (
            isLoopbackUrl(imageUrl) ||
            absolutePathAndQuery.trimStart('/') != normalizedPathAndQuery.trimStart('/')
        ) {
            baseOrigin
        } else {
            extractOrigin(imageUrl)
        }
        return "${origin.trimEnd('/')}/${normalizedPathAndQuery.trimStart('/')}"
    }

    val normalizedPathAndQuery = normalizeSimulationPath(imageUrl)
    return "${baseOrigin.trimEnd('/')}/${normalizedPathAndQuery.trimStart('/')}"
}

private fun normalizeSimulationPath(rawPathOrUrlPart: String): String {
    val pathAndQuery = rawPathOrUrlPart.trim()
    val queryStart = pathAndQuery.indexOf('?')
    val pathPart = if (queryStart >= 0) {
        pathAndQuery.substring(0, queryStart)
    } else {
        pathAndQuery
    }
    val queryPart = if (queryStart >= 0) {
        pathAndQuery.substring(queryStart)
    } else {
        ""
    }

    val normalizedPath = pathPart.trimStart('/')
    val backendPath = when {
        normalizedPath.startsWith("api/admin/simulation/media/") ->
            normalizedPath.replaceFirst("api/admin/", "api/v1/")
        normalizedPath.startsWith("api/simulation/media/") ->
            normalizedPath.replaceFirst("api/", "api/v1/")
        normalizedPath.startsWith("simulation/media/") ->
            "api/v1/$normalizedPath"
        else -> normalizedPath
    }
    return "${backendPath.trimStart('/')}$queryPart"
}

private fun extractOrigin(url: String): String {
    val trimmed = url.trim().trimEnd('/')
    val schemeIndex = trimmed.indexOf("://")
    if (schemeIndex < 0) return trimmed

    val afterSchemeIndex = schemeIndex + 3
    val pathStart = trimmed.indexOf('/', startIndex = afterSchemeIndex)
    return if (pathStart >= 0) trimmed.substring(0, pathStart) else trimmed
}

private fun extractPathAndQuery(url: String): String {
    val trimmed = url.trim()
    val schemeIndex = trimmed.indexOf("://")
    if (schemeIndex < 0) return trimmed

    val afterSchemeIndex = schemeIndex + 3
    val pathStart = trimmed.indexOf('/', startIndex = afterSchemeIndex)
    return if (pathStart >= 0) trimmed.substring(pathStart) else "/"
}

private fun isLoopbackUrl(url: String): Boolean {
    val lowered = url.lowercase()
    return lowered.contains("://localhost") ||
        lowered.contains("://127.0.0.1") ||
        lowered.contains("://[::1]")
}
