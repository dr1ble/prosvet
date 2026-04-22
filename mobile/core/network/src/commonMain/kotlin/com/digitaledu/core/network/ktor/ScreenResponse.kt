package com.digitaledu.core.network.ktor

import com.digitaledu.core.model.content.ScreenPayload
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class ScreenResponse(
    val id: String,
    @SerialName("lesson_id") val lessonId: String? = null,
    @SerialName("screen_key") val screenKey: String,
    val title: String,
    @SerialName("order_index") val orderIndex: Int,
    val payload: ScreenPayload,
)
