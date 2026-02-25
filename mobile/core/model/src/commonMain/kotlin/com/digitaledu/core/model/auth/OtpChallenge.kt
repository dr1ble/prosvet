package com.digitaledu.core.model.auth

data class OtpChallenge(
    val challengeId: String,
    val devCode: String?,
)
