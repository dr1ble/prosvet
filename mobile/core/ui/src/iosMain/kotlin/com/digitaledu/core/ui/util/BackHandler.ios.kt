package com.digitaledu.core.ui.util

import androidx.compose.runtime.Composable

@Composable
actual fun BackHandler(enabled: Boolean, onBack: () -> Unit) {
    // No-op on iOS for now as system gesture handles most cases

}
