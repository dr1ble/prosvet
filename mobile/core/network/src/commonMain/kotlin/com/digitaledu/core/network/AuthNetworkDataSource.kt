package com.digitaledu.core.network

import com.digitaledu.core.model.auth.AuthTokens
import com.digitaledu.core.model.auth.AuthMe
import com.digitaledu.core.model.auth.PasswordRecoveryRequest

interface AuthNetworkDataSource {
    suspend fun register(fullName: String, login: String, password: String): AuthTokens
    suspend fun login(login: String, password: String): AuthTokens
    suspend fun requestPasswordRecovery(loginOrEmail: String): PasswordRecoveryRequest
    suspend fun confirmPasswordRecovery(resetToken: String, newPassword: String)
    suspend fun refreshSession(refreshToken: String): AuthTokens
    suspend fun logout(refreshToken: String)
    suspend fun getCurrentUser(accessToken: String): AuthMe
    suspend fun updateCurrentUser(accessToken: String, displayName: String?, avatarKey: String?): AuthMe
    suspend fun uploadAvatar(accessToken: String, filename: String, contentType: String, content: ByteArray): AuthMe
    suspend fun bindEmail(accessToken: String, email: String): AuthMe
    suspend fun changePassword(accessToken: String, currentPassword: String, newPassword: String): AuthMe
    suspend fun updateAccountSettings(
        accessToken: String,
        learningRemindersEnabled: Boolean? = null,
        securityAlertsEnabled: Boolean? = null,
        profileVisible: Boolean? = null,
    ): AuthMe
}
