package com.digitaledu.feature.player.impl.ui.player.components

import kotlin.math.max

internal data class VideoStoryState(
    val durationLabel: String,
    val transcriptPreview: String,
    val hasTranscript: Boolean,
)

internal fun buildVideoStoryState(
    durationSec: Long,
    transcript: String?,
): VideoStoryState {
    val safeDuration = max(durationSec, 0L)
    val minutes = safeDuration / 60
    val seconds = safeDuration % 60
    val durationLabel = "%d:%02d".format(minutes, seconds)

    val normalizedTranscript = transcript?.trim().orEmpty()
    val hasTranscript = normalizedTranscript.isNotEmpty()

    return VideoStoryState(
        durationLabel = durationLabel,
        transcriptPreview = normalizedTranscript,
        hasTranscript = hasTranscript,
    )
}
