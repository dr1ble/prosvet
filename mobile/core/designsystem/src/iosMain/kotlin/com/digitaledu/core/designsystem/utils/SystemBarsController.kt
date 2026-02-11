package com.digitaledu.core.designsystem.utils

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember

class IosSystemBarsController : SystemBarsController {
    override fun setSystemBarsVisible(visible: Boolean) {
        // TODO: Implement iOS status bar hiding via SwiftUI/UIKit bridge if needed
    }
}

@Composable
actual fun rememberSystemBarsController(): SystemBarsController {
    return remember { IosSystemBarsController() }
}
