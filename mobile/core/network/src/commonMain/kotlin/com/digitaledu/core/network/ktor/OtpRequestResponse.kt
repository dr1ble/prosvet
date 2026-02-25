package com.digitaledu.core.network.ktor

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class OtpRequestResponse(
    @SerialName("challenge_id") val challengeId: String,
    @SerialName("dev_code") val devCode: String? = null,
)
