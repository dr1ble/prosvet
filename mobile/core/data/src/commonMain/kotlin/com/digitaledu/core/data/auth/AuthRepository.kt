package com.digitaledu.core.data.auth

import com.digitaledu.core.model.AuthTokens
import com.digitaledu.core.model.OtpChallenge

interface AuthRepository {
    suspend fun requestOtp(phoneNumber: String): OtpChallenge
    suspend fun verifyOtp(phoneNumber: String, code: String): AuthTokens
    suspend fun refreshSession(): Boolean
    suspend fun restoreSession(): Boolean
    suspend fun logout()
    suspend fun <T> withFreshAccessToken(block: suspend (accessToken: String) -> T): T
    fun getCachedTokens(): AuthTokens?
    fun clearSession()
}
