package com.digitaledu.core.network.ktor

import kotlinx.serialization.Serializable

@Serializable
internal data class LoginPayload(
    val login: String,
    val password: String,
)
