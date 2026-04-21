package com.digitaledu.core.designsystem.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.runtime.Composable

@Composable
actual fun colorScheme(
    darkTheme: Boolean,
    dynamicColor: Boolean,
    highContrast: Boolean,
): ColorScheme {
    return if (highContrast) ProsvetHighContrastColorScheme else ProsvetLightColorScheme
}
