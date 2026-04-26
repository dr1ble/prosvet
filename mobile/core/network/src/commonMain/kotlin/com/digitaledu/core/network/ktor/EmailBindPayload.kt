package com.digitaledu.core.network.ktor

import kotlinx.serialization.Serializable

@Serializable
internal data class EmailBindPayload(
    val email: String,
)
