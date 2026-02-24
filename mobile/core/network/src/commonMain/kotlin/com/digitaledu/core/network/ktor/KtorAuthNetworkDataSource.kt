package com.digitaledu.core.network.ktor

import com.digitaledu.core.model.AuthTokens
import com.digitaledu.core.model.OtpChallenge
import com.digitaledu.core.network.AuthNetworkDataSource
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.request.url
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

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

@Serializable
private data class OtpRequestPayload(
    val phone: String,
)

@Serializable
private data class OtpVerifyPayload(
    val phone: String,
    val code: String,
)

@Serializable
private data class LoginPayload(
    val login: String,
    val password: String,
)

@Serializable
private data class RefreshTokenPayload(
    @SerialName("refresh_token") val refreshToken: String,
)

@Serializable
private data class OtpRequestResponse(
    @SerialName("challenge_id") val challengeId: String,
    @SerialName("dev_code") val devCode: String? = null,
)

@Serializable
private data class AuthResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
)

private fun AuthResponse.toAuthTokens(): AuthTokens {
    return AuthTokens(
        accessToken = accessToken,
        refreshToken = refreshToken,
    )
}
