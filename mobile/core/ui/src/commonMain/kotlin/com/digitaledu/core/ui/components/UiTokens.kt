package com.digitaledu.core.ui.components

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

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
        val state = LocalAccessibilityUiState.current
        return if (state.tremorFilter) {
            sizeIn(minWidth = UiSize.touchTarget, minHeight = UiSize.touchTarget)
        } else {
            this
        }
    }

val Modifier.accessibilityControlScale: Modifier
    @Composable
    @ReadOnlyComposable
    get() {
        val scale = LocalAccessibilityUiState.current.controlScale.coerceIn(1.0f, 1.6f)
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
            controlScale = controlScale.coerceIn(1.0f, 1.6f),
            voiceSupport = voiceSupport,
            tremorFilter = tremorFilter,
        ),
        content = content,
    )
}
