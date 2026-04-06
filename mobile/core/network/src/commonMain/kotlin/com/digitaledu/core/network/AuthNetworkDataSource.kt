package com.digitaledu.core.network

import com.digitaledu.core.model.auth.AuthTokens
import com.digitaledu.core.model.auth.AuthMe

interface AuthNetworkDataSource {
    suspend fun register(fullName: String, login: String, password: String): AuthTokens
    suspend fun login(login: String, password: String): AuthTokens
    suspend fun refreshSession(refreshToken: String): AuthTokens
    suspend fun logout(refreshToken: String)
    suspend fun getCurrentUser(accessToken: String): AuthMe
}
