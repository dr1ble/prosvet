package com.digitaledu.core.data.auth

import com.digitaledu.core.model.auth.AuthTokens
import com.digitaledu.core.model.auth.AuthMe
import com.digitaledu.core.model.auth.PasswordRecoveryRequest
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    suspend fun register(fullName: String, login: String, password: String): AuthTokens
    suspend fun login(login: String, password: String): AuthTokens
    suspend fun requestPasswordRecovery(loginOrEmail: String): PasswordRecoveryRequest
    suspend fun confirmPasswordRecovery(resetToken: String, newPassword: String)
    suspend fun refreshSession(): Boolean
    suspend fun restoreSession(): Boolean
    suspend fun logout()
    suspend fun getCurrentUser(): AuthMe
    suspend fun updateCurrentUser(displayName: String?, avatarKey: String?): AuthMe
    suspend fun uploadAvatar(filename: String, contentType: String, content: ByteArray): AuthMe
    suspend fun bindEmail(email: String): AuthMe
    suspend fun changePassword(currentPassword: String, newPassword: String): AuthMe
    suspend fun updateAccountSettings(
        learningRemindersEnabled: Boolean? = null,
        securityAlertsEnabled: Boolean? = null,
        profileVisible: Boolean? = null,
    ): AuthMe
    suspend fun <T> withFreshAccessToken(block: suspend (accessToken: String) -> T): T
    fun getCachedTokens(): AuthTokens?
    fun observeTokens(): Flow<AuthTokens?>
    fun clearSession()
}
