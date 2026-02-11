package com.digitaledu.core.designsystem.utils

import android.app.Activity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class AndroidSystemBarsController(private val activity: Activity) : SystemBarsController {
    override fun setSystemBarsVisible(visible: Boolean) {
        val window = activity.window
        val insetsController = WindowCompat.getInsetsController(window, window.decorView)

        if (visible) {
            insetsController.show(WindowInsetsCompat.Type.systemBars())
        } else {
            insetsController.hide(WindowInsetsCompat.Type.systemBars())
            insetsController.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }
}

@Composable
actual fun rememberSystemBarsController(): SystemBarsController {
    val context = LocalContext.current
    return remember(context) {
        val activity = context as? Activity ?: throw IllegalStateException("Context is not an Activity")
        AndroidSystemBarsController(activity)
    }
}
