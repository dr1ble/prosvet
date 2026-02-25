package com.digitaledu.core.network.ktor

import kotlinx.serialization.Serializable

@Serializable
internal data class OtpVerifyPayload(
    val phone: String,
    val code: String,
)
