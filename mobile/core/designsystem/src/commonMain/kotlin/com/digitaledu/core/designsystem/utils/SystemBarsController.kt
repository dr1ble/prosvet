package com.digitaledu.core.designsystem.utils

import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.remember

/**
 * Controller to manage system bars (status bar, navigation bar) visibility.
 * Used for immersive mode in fullscreen players.
 */
interface SystemBarsController {
    fun setSystemBarsVisible(visible: Boolean)
}

@Composable
expect fun rememberSystemBarsController(): SystemBarsController
