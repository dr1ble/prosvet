package com.digitaledu.feature.home.impl.voice

internal data class VoiceSearchState(
    val query: String = "",
    val isListening: Boolean = false,
    val message: String? = null,
) {
    fun startListening(): VoiceSearchState = copy(isListening = true, message = null)

    fun withQuery(value: String): VoiceSearchState = copy(query = value, message = null)

    fun dismissMessage(): VoiceSearchState = copy(message = null)

    fun applyResult(result: VoiceSearchResult): VoiceSearchState {
        return when (result) {
            is VoiceSearchResult.Recognized -> copy(
                query = result.text.trim(),
                isListening = false,
                message = null,
            )
            is VoiceSearchResult.Error -> copy(isListening = false, message = result.message)
            is VoiceSearchResult.Unavailable -> copy(isListening = false, message = result.message)
            VoiceSearchResult.Cancelled -> copy(isListening = false, message = null)
        }
    }
}
