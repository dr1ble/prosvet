package com.digitaledu.core.network.ktor

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class AuthMeUpdatePayload(
    @SerialName("display_name") val displayName: String?,
    @SerialName("avatar_key") val avatarKey: String?,
)
