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
    suspend fun bindEmail(accessToken: String, email: String): AuthMe
}
