package com.digitaledu.feature.home.impl.voice

internal sealed interface VoiceSearchResult {
    data class Recognized(val text: String) : VoiceSearchResult
    data class Error(val message: String) : VoiceSearchResult
    data class Unavailable(val message: String) : VoiceSearchResult
    data object Cancelled : VoiceSearchResult
}
