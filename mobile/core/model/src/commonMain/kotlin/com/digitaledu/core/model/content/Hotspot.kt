package com.digitaledu.core.model.content

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Hotspot(
    val x: Float,
    val y: Float,
    val width: Float,
    val height: Float,
    val label: String,
    val hint: String,
    @SerialName("target_screen_key") val targetScreenKey: String? = null,
)
