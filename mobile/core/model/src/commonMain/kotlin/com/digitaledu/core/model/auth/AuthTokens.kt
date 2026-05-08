package com.digitaledu.core.model.auth

data class AuthTokens(
    val accessToken: String,
    val refreshToken: String,
    val initialLogin: String? = null,
    val initialPassword: String? = null,
)
