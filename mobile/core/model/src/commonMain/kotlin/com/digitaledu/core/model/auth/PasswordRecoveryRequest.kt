package com.digitaledu.core.model.auth

data class PasswordRecoveryRequest(
    val debugResetToken: String?,
)
