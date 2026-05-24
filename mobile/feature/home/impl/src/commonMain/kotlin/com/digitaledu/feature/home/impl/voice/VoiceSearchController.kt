package com.digitaledu.feature.home.impl.voice

import androidx.compose.runtime.Composable

internal interface VoiceSearchController {
    fun startListening()
}

@Composable
internal expect fun rememberVoiceSearchController(
    unavailableMessage: String,
    recognitionErrorMessage: String,
    onResult: (VoiceSearchResult) -> Unit,
): VoiceSearchController
