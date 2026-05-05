package com.digitaledu.core.data.profile

import com.digitaledu.core.model.auth.AuthMe

interface ProfileRepository {
    suspend fun getCurrentProfile(): AuthMe
    suspend fun updateDisplayName(displayName: String?, avatarKey: String?): AuthMe
    suspend fun updateAvatar(displayName: String?, avatarKey: String?): AuthMe
    suspend fun uploadAvatar(filename: String, contentType: String, content: ByteArray): AuthMe
    suspend fun bindEmail(email: String): AuthMe
    suspend fun changePassword(currentPassword: String, newPassword: String): AuthMe
    suspend fun updateAccountSettings(
        learningRemindersEnabled: Boolean? = null,
        securityAlertsEnabled: Boolean? = null,
        profileVisible: Boolean? = null,
    ): AuthMe
}
