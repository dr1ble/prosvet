package com.digitaledu.feature.player.impl.ui.player.components

import kotlin.math.max

internal data class VideoStoryState(
    val durationLabel: String,
    val transcriptPreview: String,
    val hasTranscript: Boolean,
    val hasVideoUrl: Boolean,
    val resolvedVideoUrl: String?,
)

internal fun buildVideoStoryState(
    durationSec: Long,
    transcript: String?,
    videoUrl: String = "",
    resolveUrl: (String) -> String = { it },
): VideoStoryState {
    val safeDuration = max(durationSec, 0L)
    val minutes = safeDuration / 60
    val seconds = safeDuration % 60
    val durationLabel = "$minutes:${seconds.toString().padStart(2, '0')}"

    val normalizedTranscript = transcript
        ?.let(::stripHtml)
        ?.trim()
        .orEmpty()
    val hasTranscript = normalizedTranscript.isNotEmpty()
    val normalizedVideoUrl = videoUrl.trim()
    val hasVideoUrl = normalizedVideoUrl.isNotEmpty()

    return VideoStoryState(
        durationLabel = durationLabel,
        transcriptPreview = normalizedTranscript,
        hasTranscript = hasTranscript,
        hasVideoUrl = hasVideoUrl,
        resolvedVideoUrl = if (hasVideoUrl) resolveUrl(normalizedVideoUrl) else null,
    )
}

private fun stripHtml(rawText: String): String {
    return rawText
        .replace(Regex("<[^>]+>"), " ")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace(Regex("\\s+"), " ")
}
