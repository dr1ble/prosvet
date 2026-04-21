package com.digitaledu.core.designsystem.theme

import androidx.compose.material3.ColorScheme

internal fun ColorScheme.toHighContrastScheme(): ColorScheme {
    return copy(
        primary = primary.copy(alpha = 1f),
        onPrimary = onPrimary.copy(alpha = 1f),
        primaryContainer = primary,
        onPrimaryContainer = onPrimary,
        secondary = secondary.copy(alpha = 1f),
        onSecondary = onSecondary.copy(alpha = 1f),
        secondaryContainer = secondary,
        onSecondaryContainer = onSecondary,
        tertiary = tertiary.copy(alpha = 1f),
        onTertiary = onTertiary.copy(alpha = 1f),
        tertiaryContainer = tertiary,
        onTertiaryContainer = onTertiary,
        error = error.copy(alpha = 1f),
        onError = onError.copy(alpha = 1f),
        errorContainer = error,
        onErrorContainer = onError,
        background = background.copy(alpha = 1f),
        onBackground = onBackground.copy(alpha = 1f),
        surface = surface.copy(alpha = 1f),
        onSurface = onSurface.copy(alpha = 1f),
        surfaceVariant = surfaceVariant.copy(alpha = 1f),
        onSurfaceVariant = onSurfaceVariant.copy(alpha = 1f),
        outline = onSurface,
        outlineVariant = onSurfaceVariant,
    )
}
