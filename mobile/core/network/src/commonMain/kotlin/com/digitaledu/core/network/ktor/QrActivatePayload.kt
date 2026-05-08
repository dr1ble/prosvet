package com.digitaledu.core.network.ktor

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class QrActivatePayload(
    @SerialName("token") val token: String,
)
