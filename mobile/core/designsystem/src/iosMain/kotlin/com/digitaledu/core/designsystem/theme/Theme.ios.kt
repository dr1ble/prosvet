package com.digitaledu.core.designsystem.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

@Composable
actual fun colorScheme(darkTheme: Boolean, dynamicColor: Boolean): ColorScheme {
    return if (darkTheme) {
        darkColorScheme()
    } else {
        lightColorScheme()
    }
}
