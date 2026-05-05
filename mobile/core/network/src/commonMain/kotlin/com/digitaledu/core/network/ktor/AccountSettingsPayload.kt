package com.digitaledu.core.network.ktor

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
internal data class AccountSettingsPayload(
    @SerialName("learning_reminders_enabled") val learningRemindersEnabled: Boolean? = null,
    @SerialName("security_alerts_enabled") val securityAlertsEnabled: Boolean? = null,
    @SerialName("profile_visible") val profileVisible: Boolean? = null,
)
