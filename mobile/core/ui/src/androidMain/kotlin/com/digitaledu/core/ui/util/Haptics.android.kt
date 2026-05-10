package com.digitaledu.core.ui.util

import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

@Composable
actual fun rememberErrorHapticFeedback(): () -> Unit {
    val context = LocalContext.current
    return remember(context) {
        {
            try {
                val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val manager = context.getSystemService(VibratorManager::class.java)
                    manager?.defaultVibrator
                } else {
                    @Suppress("DEPRECATION")
                    context.getSystemService(Vibrator::class.java)
                }

                if (vibrator != null && vibrator.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(
                            VibrationEffect.createOneShot(
                                200L,
                                VibrationEffect.DEFAULT_AMPLITUDE,
                            ),
                        )
                    } else {
                        @Suppress("DEPRECATION")
                        vibrator.vibrate(200L)
                    }
                }
            } catch (exception: SecurityException) {
                // VIBRATE permission missing or revoked at runtime — fail silently
                // so touch handling never crashes the app.
                Log.w("Haptics", "VIBRATE permission missing, skipping haptic", exception)
            } catch (exception: IllegalStateException) {
                // Some OEM vibrator services throw during sleep/DND; treat as no-op.
                Log.w("Haptics", "Vibrator not available", exception)
            }
        }
    }
}
