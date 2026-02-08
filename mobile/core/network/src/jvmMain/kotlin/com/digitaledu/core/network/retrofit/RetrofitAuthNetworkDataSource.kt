package com.digitaledu.core.network.retrofit

import com.digitaledu.core.model.AuthTokens
import com.digitaledu.core.model.OtpChallenge
import com.digitaledu.core.network.AuthNetworkDataSource
import com.digitaledu.core.network.NetworkException
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.io.IOException
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.HttpException
import retrofit2.Retrofit
import retrofit2.http.Body
import retrofit2.http.POST

class RetrofitAuthNetworkDataSource private constructor(
    private val authApi: RetrofitAuthApi,
) : AuthNetworkDataSource {
    override suspend fun requestOtp(phoneNumber: String): OtpChallenge {
        return executeCall {
            val response = authApi.requestOtp(
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
            val response = authApi.verifyOtp(
                payload = OtpVerifyPayload(
                    phone = phoneNumber,
                    code = code,
                ),
            )
            response.toAuthTokens()
        }
    }

    override suspend fun refreshSession(refreshToken: String): AuthTokens {
        return executeCall {
            val response = authApi.refreshSession(
                payload = RefreshTokenPayload(refreshToken = refreshToken),
            )
            response.toAuthTokens()
        }
    }

    override suspend fun logout(refreshToken: String) {
        executeCall {
            authApi.logout(
                payload = RefreshTokenPayload(refreshToken = refreshToken),
            )
        }
    }

    private suspend fun <T> executeCall(block: suspend () -> T): T {
        return try {
            block()
        } catch (exception: HttpException) {
            throw NetworkException(
                message = parseHttpError(exception),
                statusCode = exception.code(),
                cause = exception,
            )
        } catch (exception: IOException) {
            throw NetworkException(
                message = "Не удалось подключиться к серверу",
                cause = exception,
            )
        } catch (exception: Exception) {
            throw NetworkException(
                message = "Неизвестная ошибка сети",
                cause = exception,
            )
        }
    }

    private fun parseHttpError(exception: HttpException): String {
        val statusCode = exception.code()
        val rawBody = exception.response()?.errorBody()?.string().orEmpty()
        val detailMatch = DETAIL_PATTERN.find(rawBody)?.groupValues?.getOrNull(1)
        val detail = detailMatch?.replace("\\\"", "\"")
        return detail ?: "Ошибка сервера ($statusCode)"
    }

    companion object {
        private val DETAIL_PATTERN = """"detail"\s*:\s*"([^"]+)"""".toRegex()

        @OptIn(ExperimentalSerializationApi::class)
        fun create(
            baseUrl: String,
            enableNetworkLogs: Boolean,
        ): RetrofitAuthNetworkDataSource {
            val json = Json {
                ignoreUnknownKeys = true
                explicitNulls = false
            }
            val client = OkHttpClient.Builder()
                .addInterceptor(
                    HttpLoggingInterceptor().apply {
                        level = if (enableNetworkLogs) {
                            HttpLoggingInterceptor.Level.BODY
                        } else {
                            HttpLoggingInterceptor.Level.NONE
                        }
                    },
                )
                .build()
            val retrofit = Retrofit.Builder()
                .baseUrl(ensureTrailingSlash(baseUrl))
                .client(client)
                .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
                .build()
            return RetrofitAuthNetworkDataSource(
                authApi = retrofit.create(RetrofitAuthApi::class.java),
            )
        }

        private fun ensureTrailingSlash(baseUrl: String): String {
            return if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        }
    }
}

private interface RetrofitAuthApi {
    @POST("/api/v1/auth/otp/request")
    suspend fun requestOtp(
        @Body payload: OtpRequestPayload,
    ): OtpRequestResponse

    @POST("/api/v1/auth/otp/verify")
    suspend fun verifyOtp(
        @Body payload: OtpVerifyPayload,
    ): AuthResponse

    @POST("/api/v1/auth/refresh")
    suspend fun refreshSession(
        @Body payload: RefreshTokenPayload,
    ): AuthResponse

    @POST("/api/v1/auth/logout")
    suspend fun logout(
        @Body payload: RefreshTokenPayload,
    ): LogoutResponse
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
