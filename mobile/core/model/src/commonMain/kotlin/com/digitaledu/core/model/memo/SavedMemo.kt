package com.digitaledu.core.model.memo

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SavedMemo(
    val id: String,
    val title: String,
    @SerialName("content_html") val contentHtml: String,
    @SerialName("course_title") val courseTitle: String,
    @SerialName("lesson_title") val lessonTitle: String,
    @SerialName("saved_at_epoch_ms") val savedAtEpochMs: Long,
    @SerialName("release_id") val releaseId: String? = null,
    @SerialName("screen_id") val screenId: String? = null,
    @SerialName("lesson_id") val lessonId: String? = null,
)
