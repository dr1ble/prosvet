package com.digitaledu.feature.player.impl.ui.player.components

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.ActivityInfo
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalContext
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

@Composable
internal actual fun VideoFullscreenEffect(isFullscreen: Boolean) {
    val activity = LocalContext.current.findActivity() ?: return

    DisposableEffect(activity, isFullscreen) {
        if (!isFullscreen) {
            onDispose { }
        } else {
            val window = activity.window
            val insetsController = WindowCompat.getInsetsController(window, window.decorView)
            val previousOrientation = activity.requestedOrientation

            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            insetsController.hide(WindowInsetsCompat.Type.systemBars())
            insetsController.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE

            onDispose {
                activity.requestedOrientation = previousOrientation
                insetsController.show(WindowInsetsCompat.Type.systemBars())
            }
        }
    }
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}
