package com.digitaledu.core.network

import com.digitaledu.core.model.AuthTokens
import com.digitaledu.core.model.OtpChallenge

interface AuthNetworkDataSource {
    suspend fun requestOtp(phoneNumber: String): OtpChallenge
    suspend fun verifyOtp(phoneNumber: String, code: String): AuthTokens
    suspend fun login(login: String, password: String): AuthTokens
    suspend fun refreshSession(refreshToken: String): AuthTokens
    suspend fun logout(refreshToken: String)
}
