package com.digitaledu.core.ui.components

import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

object AuthUiSpacing {
    val screenHorizontal: Dp = 24.dp
    val sectionXl: Dp = 40.dp
    val sectionLg: Dp = 32.dp
    val sectionMd: Dp = 24.dp
    val sectionSm: Dp = 16.dp
    val itemMd: Dp = 12.dp
    val itemSm: Dp = 8.dp
    val itemXs: Dp = 6.dp
    val item2xs: Dp = 4.dp
    val cardPadding: Dp = 20.dp
    val contentPadding: Dp = 16.dp
}

object AuthUiSize {
    val buttonHeight: Dp = 56.dp
    val scannerSize: Dp = 280.dp
    val scannerCornerLength: Dp = 32.dp
    val iconXl: Dp = 32.dp
    val iconLg: Dp = 24.dp
    val iconMd: Dp = 20.dp
    val iconSm: Dp = 18.dp
    val badgeContainer: Dp = 64.dp
    val iconContainer: Dp = 48.dp
}

object AuthUiStroke {
    val hairline: Dp = 1.dp
    val thin: Dp = 2.dp
    val regular: Dp = 4.dp
}

object AuthUiOpacity {
    const val subtle: Float = 0.10f
    const val border: Float = 0.20f
    const val disabled: Float = 0.50f
    const val headerSurface: Float = 0.80f
}

object AuthUiShapes {
    val pill: Shape = CircleShape
    val cardMd: Shape = RoundedCornerShape(12.dp)
    val cardLg: Shape = RoundedCornerShape(16.dp)
}

object AuthUiColors {
    val splashOnboardingGradient: List<Color> = listOf(
        Color(0xFFCCF6FF),
        Color(0xFFD6EAFF),
        Color(0xFFD8F8E8),
        Color(0xFFF3F8FF),
    )
}

object AuthUiTypography {
    val hero: TextStyle
        @Composable get() = MaterialTheme.typography.headlineLarge

    val title: TextStyle
        @Composable get() = MaterialTheme.typography.headlineMedium

    val header: TextStyle
        @Composable get() = MaterialTheme.typography.titleLarge

    val bodyLg: TextStyle
        @Composable get() = MaterialTheme.typography.bodyLarge

    val bodyMd: TextStyle
        @Composable get() = MaterialTheme.typography.bodyMedium

    val bodySm: TextStyle
        @Composable get() = MaterialTheme.typography.bodySmall

    val labelLg: TextStyle
        @Composable get() = MaterialTheme.typography.labelLarge

    val labelMd: TextStyle
        @Composable get() = MaterialTheme.typography.labelMedium

    val labelSm: TextStyle
        @Composable get() = MaterialTheme.typography.labelSmall
}
