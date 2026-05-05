package com.digitaledu.core.network.ktor

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class AuthMeResponse(
    @SerialName("user_id") val userId: String,
    @SerialName("role") val role: String,
    @SerialName("status") val status: String,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("email") val email: String? = null,
    @SerialName("avatar_key") val avatarKey: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("learning_reminders_enabled") val learningRemindersEnabled: Boolean = true,
    @SerialName("security_alerts_enabled") val securityAlertsEnabled: Boolean = true,
    @SerialName("profile_visible") val profileVisible: Boolean = false,
    @SerialName("permissions") val permissions: List<String> = emptyList(),
)
