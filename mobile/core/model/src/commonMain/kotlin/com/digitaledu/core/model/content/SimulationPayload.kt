package com.digitaledu.core.model.content

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
@SerialName("simulation")
data class SimulationPayload(
    @SerialName("image_url") val imageUrl: String,
    val hotspots: List<Hotspot> = emptyList(),
    @SerialName("is_start") val isStart: Boolean = false,
    @SerialName("is_completion") val isCompletion: Boolean = false,
    @SerialName("context_ref") val contextRef: String? = null,
) : ScreenPayload
