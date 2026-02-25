package com.digitaledu.core.model.content

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
@SerialName("unknown")
data class UnknownPayload(
    val raw: String,
) : ScreenPayload
