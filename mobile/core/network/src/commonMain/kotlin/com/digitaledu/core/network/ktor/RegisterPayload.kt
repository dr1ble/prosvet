package com.digitaledu.core.network.ktor

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class RegisterPayload(
    @SerialName("full_name") val fullName: String,
    val login: String,
    val password: String,
)
