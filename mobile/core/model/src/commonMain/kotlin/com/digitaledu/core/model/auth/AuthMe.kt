package com.digitaledu.core.model.auth

data class AuthMe(
    val userId: String,
    val role: String,
    val status: String,
    val displayName: String?,
    val email: String?,
    val avatarKey: String? = null,
    val avatarUrl: String? = null,
    val learningRemindersEnabled: Boolean = true,
    val securityAlertsEnabled: Boolean = true,
    val profileVisible: Boolean = false,
    val permissions: List<String>,
)
