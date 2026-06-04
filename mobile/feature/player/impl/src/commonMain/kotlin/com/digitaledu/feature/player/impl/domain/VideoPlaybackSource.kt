package com.digitaledu.feature.player.impl.domain

internal sealed interface VideoPlaybackSource {
    data class Direct(val url: String) : VideoPlaybackSource
}

internal fun resolveVideoPlaybackSource(videoUrl: String): VideoPlaybackSource? {
    val normalizedUrl = videoUrl.trim()
    if (normalizedUrl.isEmpty()) return null

    return VideoPlaybackSource.Direct(normalizedUrl)
}
