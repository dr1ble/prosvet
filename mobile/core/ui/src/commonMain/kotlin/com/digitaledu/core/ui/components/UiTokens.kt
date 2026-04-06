package com.digitaledu.core.ui.components

import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Shape
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
