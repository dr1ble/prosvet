package com.digitaledu.core.model.content

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
@SerialName("video")
data class VideoPayload(
    @SerialName("video_url") val videoUrl: String,
    @SerialName("duration_sec") val durationSec: Long,
    val transcript: String? = null,
) : ScreenPayload
