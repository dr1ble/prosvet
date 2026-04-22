package com.digitaledu.core.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Density

@Composable
fun DigitalEduTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    highContrast: Boolean = false,
    fontScale: Float = 1.0f,
    boldText: Boolean = false,
    content: @Composable () -> Unit,
) {
    val colorScheme = colorScheme(
        darkTheme = darkTheme,
        dynamicColor = dynamicColor,
        highContrast = highContrast,
    )
    val density = LocalDensity.current
    val appDensity = Density(
        density = density.density,
        fontScale = density.fontScale * fontScale.coerceIn(1.0f, 1.6f),
    )

    CompositionLocalProvider(LocalDensity provides appDensity) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = if (boldText) Typography().withBoldText() else Typography(),
            content = content,
        )
    }
}

private fun Typography.withBoldText(): Typography = copy(
    displayLarge = displayLarge.copy(fontWeight = FontWeight.Bold),
    displayMedium = displayMedium.copy(fontWeight = FontWeight.Bold),
    displaySmall = displaySmall.copy(fontWeight = FontWeight.Bold),
    headlineLarge = headlineLarge.copy(fontWeight = FontWeight.Bold),
    headlineMedium = headlineMedium.copy(fontWeight = FontWeight.Bold),
    headlineSmall = headlineSmall.copy(fontWeight = FontWeight.Bold),
    titleLarge = titleLarge.copy(fontWeight = FontWeight.Bold),
    titleMedium = titleMedium.copy(fontWeight = FontWeight.Bold),
    titleSmall = titleSmall.copy(fontWeight = FontWeight.Bold),
    bodyLarge = bodyLarge.copy(fontWeight = FontWeight.SemiBold),
    bodyMedium = bodyMedium.copy(fontWeight = FontWeight.SemiBold),
    bodySmall = bodySmall.copy(fontWeight = FontWeight.SemiBold),
    labelLarge = labelLarge.copy(fontWeight = FontWeight.Bold),
    labelMedium = labelMedium.copy(fontWeight = FontWeight.Bold),
    labelSmall = labelSmall.copy(fontWeight = FontWeight.Bold),
)

@Composable
expect fun colorScheme(
    darkTheme: Boolean,
    dynamicColor: Boolean,
    highContrast: Boolean,
): ColorScheme
