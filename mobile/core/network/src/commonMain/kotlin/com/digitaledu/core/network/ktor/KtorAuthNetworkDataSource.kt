package com.digitaledu.core.network.ktor

import com.digitaledu.core.model.auth.AuthTokens
import com.digitaledu.core.model.auth.OtpChallenge
import com.digitaledu.core.network.AuthNetworkDataSource
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.request.url
import io.ktor.http.ContentType
import io.ktor.http.contentType

class KtorAuthNetworkDataSource(
    private val client: HttpClient,
) : AuthNetworkDataSource {

    override suspend fun requestOtp(phoneNumber: String): OtpChallenge {
        return executeCall {
            val response = postJson<OtpRequestResponse>(
                path = "api/v1/auth/otp/request",
                payload = OtpRequestPayload(phone = phoneNumber),
            )

            OtpChallenge(
                challengeId = response.challengeId,
                devCode = response.devCode,
            )
        }
    }

    override suspend fun verifyOtp(phoneNumber: String, code: String): AuthTokens {
        return executeCall {
            postJson<AuthResponse>(
                path = "api/v1/auth/otp/verify",
                payload = OtpVerifyPayload(phone = phoneNumber, code = code),
            ).toAuthTokens()
        }
    }

    override suspend fun login(login: String, password: String): AuthTokens {
        return executeCall {
            postJson<AuthResponse>(
                path = "api/v1/auth/login",
                payload = LoginPayload(login = login, password = password),
            ).toAuthTokens()
        }
    }

    override suspend fun refreshSession(refreshToken: String): AuthTokens {
        return executeCall {
            postJson<AuthResponse>(
                path = "api/v1/auth/refresh",
                payload = RefreshTokenPayload(refreshToken = refreshToken),
            ).toAuthTokens()
        }
    }

    override suspend fun logout(refreshToken: String) {
        executeCall {
            client.post {
                url("api/v1/auth/logout")
                contentType(ContentType.Application.Json)
                setBody(RefreshTokenPayload(refreshToken = refreshToken))
            }
        }
    }

    private suspend inline fun <reified T> postJson(path: String, payload: Any): T {
        return client.post {
            url(path)
            contentType(ContentType.Application.Json)
            setBody(payload)
        }.body()
    }
}

private fun AuthResponse.toAuthTokens(): AuthTokens {
    return AuthTokens(
        accessToken = accessToken,
        refreshToken = refreshToken,
    )
}
