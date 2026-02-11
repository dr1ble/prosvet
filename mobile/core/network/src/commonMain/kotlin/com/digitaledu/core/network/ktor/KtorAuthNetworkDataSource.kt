package com.digitaledu.core.network.ktor

import com.digitaledu.core.model.AuthTokens
import com.digitaledu.core.model.OtpChallenge
import com.digitaledu.core.network.AuthNetworkDataSource
import com.digitaledu.core.network.NetworkException
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.plugins.RedirectResponseException
import io.ktor.client.plugins.ServerResponseException
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
            val response = client.post {
                url("api/v1/auth/otp/request")
                contentType(ContentType.Application.Json)
                setBody(OtpRequestPayload(phone = phoneNumber))
            }.body<OtpRequestResponse>()
            
            OtpChallenge(
                challengeId = response.challengeId,
                devCode = response.devCode,
            )
        }
    }

    override suspend fun verifyOtp(phoneNumber: String, code: String): AuthTokens {
        return executeCall {
            val response = client.post {
                url("api/v1/auth/otp/verify")
                contentType(ContentType.Application.Json)
                setBody(OtpVerifyPayload(phone = phoneNumber, code = code))
            }.body<AuthResponse>()
            
            response.toAuthTokens()
        }
    }

    override suspend fun refreshSession(refreshToken: String): AuthTokens {
        return executeCall {
            val response = client.post {
                url("api/v1/auth/refresh")
                contentType(ContentType.Application.Json)
                setBody(RefreshTokenPayload(refreshToken = refreshToken))
            }.body<AuthResponse>()
            
            response.toAuthTokens()
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

    private suspend fun <T> executeCall(block: suspend () -> T): T {
        return try {
            block()
        } catch (e: ClientRequestException) {
            throw NetworkException(
                message = "Client error: ${e.response.status.value}",
                statusCode = e.response.status.value,
                cause = e
            )
        } catch (e: ServerResponseException) {
            throw NetworkException(
                message = "Server error: ${e.response.status.value}",
                statusCode = e.response.status.value,
                cause = e
            )
        } catch (e: RedirectResponseException) {
            throw NetworkException(
                message = "Redirect error: ${e.response.status.value}",
                statusCode = e.response.status.value,
                cause = e
            )
        } catch (e: Exception) {
            throw NetworkException(
                message = "Unknown network error",
                cause = e
            )
        }
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

@Serializable
private data class LogoutResponse(
    val status: String,
)

private fun AuthResponse.toAuthTokens(): AuthTokens {
    return AuthTokens(
        accessToken = accessToken,
        refreshToken = refreshToken,
    )
}
