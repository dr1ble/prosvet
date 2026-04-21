package com.digitaledu.core.designsystem.theme

import android.os.Build
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

@Composable
actual fun colorScheme(
    darkTheme: Boolean,
    dynamicColor: Boolean,
    highContrast: Boolean,
): ColorScheme {
    return when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            val base = if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
            if (highContrast) base.toHighContrastScheme() else base
        }
        highContrast -> ProsvetHighContrastColorScheme
        else -> ProsvetLightColorScheme
    }
}
