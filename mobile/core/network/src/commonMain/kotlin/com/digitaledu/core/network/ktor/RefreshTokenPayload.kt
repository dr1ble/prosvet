package com.digitaledu.core.network.ktor

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class RefreshTokenPayload(
    @SerialName("refresh_token") val refreshToken: String,
)
