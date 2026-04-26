package com.digitaledu.core.network.ktor

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class PasswordRecoveryRequestPayload(
    @SerialName("login_or_email") val loginOrEmail: String,
)

@Serializable
internal data class PasswordRecoveryRequestResponse(
    val status: String,
    @SerialName("debug_reset_token") val debugResetToken: String? = null,
)

@Serializable
internal data class PasswordRecoveryConfirmPayload(
    @SerialName("reset_token") val resetToken: String,
    @SerialName("new_password") val newPassword: String,
)
