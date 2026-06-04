package com.digitaledu.core.ui.components

import androidx.compose.foundation.border
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.waitForUpOrCancellation
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.material3.MaterialTheme
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.time.TimeSource

class TremorClickDebouncer(
    private val windowMillis: Long = DEFAULT_WINDOW_MILLIS,
    private val minimumPressMillis: Long = DEFAULT_MINIMUM_PRESS_MILLIS,
) {
    private var lastAcceptedClickMillis: Long? = null
    private var pendingDelayedClickMillis: Long? = null
    private var lastBurstRejectedClickMillis: Long? = null

    fun shouldAcceptClick(
        tremorFilterEnabled: Boolean,
        nowMillis: Long,
        pressDurationMillis: Long = minimumPressMillis,
    ): Boolean {
        if (!tremorFilterEnabled) {
            lastAcceptedClickMillis = nowMillis
            return true
        }

        if (pressDurationMillis < minimumPressMillis) {
            return false
        }

        val lastClickMillis = lastAcceptedClickMillis
        if (lastClickMillis != null && nowMillis - lastClickMillis < windowMillis) {
            return false
        }

        lastAcceptedClickMillis = nowMillis
        return true
    }

    fun shouldScheduleDelayedClick(
        tremorFilterEnabled: Boolean,
        nowMillis: Long,
    ): Boolean {
        if (!tremorFilterEnabled) {
            lastAcceptedClickMillis = nowMillis
            return true
        }

        val lastRejectedMillis = lastBurstRejectedClickMillis
        if (lastRejectedMillis != null && nowMillis - lastRejectedMillis < windowMillis) {
            return false
        }

        val pendingMillis = pendingDelayedClickMillis
        if (pendingMillis != null && nowMillis - pendingMillis < windowMillis) {
            pendingDelayedClickMillis = null
            lastBurstRejectedClickMillis = nowMillis
            return false
        }

        val lastClickMillis = lastAcceptedClickMillis
        if (lastClickMillis != null && nowMillis - lastClickMillis < windowMillis) {
            return false
        }

        pendingDelayedClickMillis = nowMillis
        return true
    }

    fun shouldAcceptDelayedClick(nowMillis: Long): Boolean {
        val pendingMillis = pendingDelayedClickMillis ?: return false
        pendingDelayedClickMillis = null

        if (nowMillis - pendingMillis < windowMillis) {
            return false
        }

        val lastRejectedMillis = lastBurstRejectedClickMillis
        if (lastRejectedMillis != null && nowMillis - lastRejectedMillis < windowMillis) {
            return false
        }

        val lastClickMillis = lastAcceptedClickMillis
        if (lastClickMillis != null && nowMillis - lastClickMillis < windowMillis) {
            return false
        }

        lastAcceptedClickMillis = nowMillis
        return true
    }

    private companion object {
        const val DEFAULT_WINDOW_MILLIS = 450L
        const val DEFAULT_MINIMUM_PRESS_MILLIS = 200L
    }
}

object UiSpacing {
    val xxs: Dp = 4.dp
    val xs: Dp = 8.dp
    val sm: Dp = 12.dp
    val md: Dp = 16.dp
    val lg: Dp = 20.dp
    val xl: Dp = 24.dp
    val xxl: Dp = 32.dp
}

object UiSize {
    val iconSm: Dp = 18.dp
    val iconMd: Dp = 20.dp
    val iconLg: Dp = 24.dp
    val touchTarget: Dp = 48.dp
}

object UiStroke {
    val hairline: Dp = 1.dp
    val thin: Dp = 2.dp
    val regular: Dp = 4.dp
}

object UiShapes {
    val pill: Shape = CircleShape
    val chip: Shape = RoundedCornerShape(4.dp)
    val cardSm: Shape = RoundedCornerShape(8.dp)
    val cardMd: Shape = RoundedCornerShape(12.dp)
    val cardLg: Shape = RoundedCornerShape(16.dp)
    val cardXl: Shape = RoundedCornerShape(20.dp)
}

object UiOpacity {
    const val subtle: Float = 0.08f
    const val medium: Float = 0.20f
    const val soft: Float = 0.30f
    const val border: Float = 0.25f
    const val strong: Float = 0.60f
    const val textSecondaryOnScrim: Float = 0.92f
    const val scrimOverlay: Float = 0.75f
}

@Stable
data class AccessibilityUiState(
    val controlScale: Float = 1.0f,
    val voiceSupport: Boolean = false,
    val tremorFilter: Boolean = false,
)

val LocalAccessibilityUiState = compositionLocalOf { AccessibilityUiState() }

val Modifier.accessibilityTouchTarget: Modifier
    @Composable
    @ReadOnlyComposable
    get() {
        return this
    }

fun Modifier.accessibilityTremorFilteredClickable(
    enabled: Boolean = true,
    onClick: () -> Unit,
): Modifier = composed {
    val state = LocalAccessibilityUiState.current
    val latestOnClick by rememberUpdatedState(onClick)
    val timeSource = remember { TimeSource.Monotonic.markNow() }
    val debouncer = remember { TremorClickDebouncer() }

    if (!state.tremorFilter) {
        clickable(enabled = enabled) { latestOnClick() }
    } else {
        pointerInput(enabled) {
            awaitEachGesture {
                val down = awaitFirstDown(requireUnconsumed = false)
                val up = waitForUpOrCancellation() ?: return@awaitEachGesture
                val nowMillis = timeSource.elapsedNow().inWholeMilliseconds
                val pressDurationMillis = up.uptimeMillis - down.uptimeMillis

                if (enabled && debouncer.shouldAcceptClick(true, nowMillis, pressDurationMillis)) {
                    latestOnClick()
                }
            }
        }
    }
}

@Composable
fun rememberTremorFilteredOnClick(
    enabled: Boolean = true,
    onClick: () -> Unit,
): () -> Unit {
    val state = LocalAccessibilityUiState.current
    val latestOnClick by rememberUpdatedState(onClick)
    val timeSource = remember { TimeSource.Monotonic.markNow() }
    val debouncer = remember { TremorClickDebouncer() }
    val scope = rememberCoroutineScope()
    var pendingClickJob by remember { mutableStateOf<Job?>(null) }

    DisposableEffect(Unit) {
        onDispose { pendingClickJob?.cancel() }
    }

    return remember(enabled, state.tremorFilter) {
        {
            if (enabled) {
                val nowMillis = timeSource.elapsedNow().inWholeMilliseconds
                if (!state.tremorFilter) {
                    latestOnClick()
                } else if (debouncer.shouldScheduleDelayedClick(true, nowMillis)) {
                    pendingClickJob?.cancel()
                    pendingClickJob = scope.launch {
                        delay(450L)
                        val delayedNowMillis = timeSource.elapsedNow().inWholeMilliseconds
                        if (debouncer.shouldAcceptDelayedClick(delayedNowMillis)) {
                            latestOnClick()
                        }
                    }
                } else {
                    pendingClickJob?.cancel()
                    pendingClickJob = null
                }
            }
        }
    }
}

val Modifier.accessibilityControlScale: Modifier
    @Composable
    @ReadOnlyComposable
    get() {
        val scale = LocalAccessibilityUiState.current.controlScale.coerceIn(1.0f, 1.3f)
        return if (scale > 1.0f) {
            graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
        } else {
            this
        }
    }

fun Modifier.accessibilitySemantics(
    label: String,
    state: String? = null,
    role: Role? = null,
    enabled: Boolean = true,
): Modifier {
    return semantics(mergeDescendants = true) {
        if (enabled) {
            contentDescription = label
            if (state != null) {
                stateDescription = state
            }
            if (role != null) {
                this.role = role
            }
        }
    }
}

fun Modifier.accessibilityFocusHighlight(
    shape: Shape = UiShapes.cardLg,
    color: Color,
): Modifier = composed {
    var isFocused by remember { mutableStateOf(false) }
    this
        .onFocusChanged { isFocused = it.isFocused }
        .then(
            if (isFocused) {
                Modifier.border(width = UiStroke.regular, color = color, shape = shape)
            } else {
                Modifier
            },
        )
}

@Composable
fun ProvideAccessibilityUiState(
    controlScale: Float,
    voiceSupport: Boolean,
    tremorFilter: Boolean,
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(
        LocalAccessibilityUiState provides AccessibilityUiState(
            controlScale = controlScale.coerceIn(1.0f, 1.3f),
            voiceSupport = voiceSupport,
            tremorFilter = tremorFilter,
        ),
        content = content,
    )
}

@Composable
fun AccessibilitySettingHeader(
    icon: @Composable BoxScope.() -> Unit,
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
    iconSize: Dp = 48.dp,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm),
    ) {
        Box(
            modifier = Modifier
                .sizeIn(minWidth = iconSize, minHeight = iconSize)
                .background(MaterialTheme.colorScheme.surfaceContainerHigh, UiShapes.pill),
            contentAlignment = androidx.compose.ui.Alignment.Center,
            content = icon,
        )
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.xxs),
        ) {
            androidx.compose.material3.Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            subtitle?.let {
                androidx.compose.material3.Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
fun AccessibilityStackedControlRow(
    header: @Composable () -> Unit,
    trailingControl: (@Composable () -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
    ) {
        header()
        trailingControl?.let {
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = androidx.compose.ui.Alignment.CenterEnd,
            ) {
                it()
            }
        }
    }
}

@Composable
fun AccessibilityScaledControlContainer(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier = modifier
            .accessibilityControlScale
            .accessibilityTouchTarget,
        contentAlignment = Alignment.Center,
        content = content,
    )
}
