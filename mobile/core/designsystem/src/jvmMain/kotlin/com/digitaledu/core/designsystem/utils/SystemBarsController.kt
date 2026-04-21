package com.digitaledu.core.designsystem.utils

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember

class NoOpSystemBarsController : SystemBarsController {
    override fun setSystemBarsVisible(visible: Boolean) = Unit
}

@Composable
actual fun rememberSystemBarsController(): SystemBarsController {
    return remember { NoOpSystemBarsController() }
}
