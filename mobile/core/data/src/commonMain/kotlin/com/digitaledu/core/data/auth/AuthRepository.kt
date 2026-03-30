package com.digitaledu.core.data.auth

import com.digitaledu.core.model.auth.AuthTokens
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    suspend fun login(login: String, password: String): AuthTokens
    suspend fun refreshSession(): Boolean
    suspend fun restoreSession(): Boolean
    suspend fun logout()
    suspend fun <T> withFreshAccessToken(block: suspend (accessToken: String) -> T): T
    fun getCachedTokens(): AuthTokens?
    fun observeTokens(): Flow<AuthTokens?>
    fun clearSession()
}
