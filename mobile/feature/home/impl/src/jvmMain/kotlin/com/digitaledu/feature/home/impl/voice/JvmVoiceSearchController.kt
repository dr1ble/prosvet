package com.digitaledu.feature.home.impl.voice

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember

@Composable
internal actual fun rememberVoiceSearchController(
    unavailableMessage: String,
    recognitionErrorMessage: String,
    onResult: (VoiceSearchResult) -> Unit,
): VoiceSearchController {
    return remember(unavailableMessage, onResult) {
        object : VoiceSearchController {
            override fun startListening() {
                onResult(VoiceSearchResult.Unavailable(unavailableMessage))
            }
        }
    }
}
