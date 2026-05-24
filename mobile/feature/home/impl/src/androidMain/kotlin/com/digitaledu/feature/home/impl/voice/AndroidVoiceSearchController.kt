package com.digitaledu.feature.home.impl.voice

import android.Manifest
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import java.util.Locale

@Composable
internal actual fun rememberVoiceSearchController(
    unavailableMessage: String,
    recognitionErrorMessage: String,
    onResult: (VoiceSearchResult) -> Unit,
): VoiceSearchController {
    val context = LocalContext.current
    val latestOnResult = rememberUpdatedState(onResult)

    val speechLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        if (result.resultCode != Activity.RESULT_OK) {
            latestOnResult.value(VoiceSearchResult.Cancelled)
            return@rememberLauncherForActivityResult
        }
        val text = result.data
            ?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            ?.firstOrNull()
            ?.trim()
            .orEmpty()

        if (text.isBlank()) {
            latestOnResult.value(VoiceSearchResult.Error(recognitionErrorMessage))
        } else {
            latestOnResult.value(VoiceSearchResult.Recognized(text))
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            launchVoiceSearch(
                context = context,
                unavailableMessage = unavailableMessage,
                recognitionErrorMessage = recognitionErrorMessage,
                onResult = latestOnResult.value,
                launch = speechLauncher::launch,
            )
        } else {
            latestOnResult.value(VoiceSearchResult.Error(recognitionErrorMessage))
        }
    }

    return remember(context, unavailableMessage, recognitionErrorMessage, speechLauncher, permissionLauncher) {
        object : VoiceSearchController {
            override fun startListening() {
                val permission = ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.RECORD_AUDIO,
                )
                if (permission == PackageManager.PERMISSION_GRANTED) {
                    launchVoiceSearch(
                        context = context,
                        unavailableMessage = unavailableMessage,
                        recognitionErrorMessage = recognitionErrorMessage,
                        onResult = latestOnResult.value,
                        launch = speechLauncher::launch,
                    )
                } else {
                    permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                }
            }
        }
    }
}

private fun launchVoiceSearch(
    context: Context,
    unavailableMessage: String,
    recognitionErrorMessage: String,
    onResult: (VoiceSearchResult) -> Unit,
    launch: (Intent) -> Unit,
) {
    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale("ru", "RU").toLanguageTag())
        putExtra(RecognizerIntent.EXTRA_PROMPT, "Назовите курс")
    }

    if (intent.resolveActivity(context.packageManager) == null) {
        onResult(VoiceSearchResult.Unavailable(unavailableMessage))
        return
    }

    try {
        launch(intent)
    } catch (_: ActivityNotFoundException) {
        onResult(VoiceSearchResult.Unavailable(unavailableMessage))
    } catch (_: RuntimeException) {
        onResult(VoiceSearchResult.Error(recognitionErrorMessage))
    }
}
