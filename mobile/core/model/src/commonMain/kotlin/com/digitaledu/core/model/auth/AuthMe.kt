package com.digitaledu.core.model.auth

data class AuthMe(
    val userId: String,
    val role: String,
    val status: String,
    val displayName: String?,
    val permissions: List<String>,
)
