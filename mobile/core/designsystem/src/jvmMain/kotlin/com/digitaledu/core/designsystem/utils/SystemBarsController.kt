package com.digitaledu.core.designsystem.utils

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember

class NoOpSystemBarsController : SystemBarsController {
    override fun setSystemBarsVisible(visible: Boolean) {
        // No-op for platforms where this isn't implemented yet or not applicable (Desktop)
        // iOS implementation would go in iosMain
    }
}

@Composable
actual fun rememberSystemBarsController(): SystemBarsController {
    return remember { NoOpSystemBarsController() }
}
