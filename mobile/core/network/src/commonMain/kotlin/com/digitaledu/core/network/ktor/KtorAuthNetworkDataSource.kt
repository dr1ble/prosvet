package com.digitaledu.core.network.ktor

import com.digitaledu.core.model.auth.AuthTokens
import com.digitaledu.core.model.auth.AuthMe
import com.digitaledu.core.model.auth.PasswordRecoveryRequest
import com.digitaledu.core.network.AuthNetworkDataSource
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.headers
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.forms.MultiPartFormDataContent
import io.ktor.client.request.forms.formData
import io.ktor.client.request.setBody
import io.ktor.client.request.url
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType

class KtorAuthNetworkDataSource(
    private val client: HttpClient,
) : AuthNetworkDataSource {

    override suspend fun register(fullName: String, login: String, password: String): AuthTokens {
        return executeCall {
            postJson<AuthResponse>(
                path = "api/v1/auth/register",
                payload = RegisterPayload(
                    fullName = fullName,
                    login = login,
                    password = password,
                ),
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

    override suspend fun activateQr(token: String): AuthTokens {
        return executeCall {
            postJson<AuthResponse>(
                path = "api/v1/auth/qr/activate",
                payload = QrActivatePayload(token = token),
            ).toAuthTokens()
        }
    }

    override suspend fun requestPasswordRecovery(loginOrEmail: String): PasswordRecoveryRequest {
        return executeCall {
            client.post {
                url("api/v1/auth/password-recovery/request")
                contentType(ContentType.Application.Json)
                setBody(PasswordRecoveryRequestPayload(loginOrEmail = loginOrEmail))
            }.body<PasswordRecoveryRequestResponse>().toPasswordRecoveryRequest()
        }
    }

    override suspend fun confirmPasswordRecovery(resetToken: String, newPassword: String) {
        executeCall {
            client.post {
                url("api/v1/auth/password-recovery/confirm")
                contentType(ContentType.Application.Json)
                setBody(
                    PasswordRecoveryConfirmPayload(
                        resetToken = resetToken,
                        newPassword = newPassword,
                    )
                )
            }
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

    override suspend fun getCurrentUser(accessToken: String): AuthMe {
        return executeCall {
            client.get {
                url("api/v1/auth/me")
                headers {
                    append(HttpHeaders.Authorization, "Bearer $accessToken")
                }
            }.body<AuthMeResponse>().toAuthMe()
        }
    }

    override suspend fun updateCurrentUser(
        accessToken: String,
        displayName: String?,
        avatarKey: String?,
    ): AuthMe {
        return executeCall {
            client.patch {
                url("api/v1/auth/me")
                contentType(ContentType.Application.Json)
                headers {
                    append(HttpHeaders.Authorization, "Bearer $accessToken")
                }
                setBody(AuthMeUpdatePayload(displayName = displayName, avatarKey = avatarKey))
            }.body<AuthMeResponse>().toAuthMe()
        }
    }

    override suspend fun uploadAvatar(
        accessToken: String,
        filename: String,
        contentType: String,
        content: ByteArray,
    ): AuthMe {
        return executeCall {
            client.post {
                url("api/v1/auth/me/avatar")
                headers {
                    append(HttpHeaders.Authorization, "Bearer $accessToken")
                }
                setBody(
                    MultiPartFormDataContent(
                        formData {
                            append(
                                key = "file",
                                value = content,
                                headers = Headers.build {
                                    append(HttpHeaders.ContentType, contentType)
                                    append(
                                        HttpHeaders.ContentDisposition,
                                        "form-data; name=\"file\"; filename=\"$filename\"",
                                    )
                                },
                            )
                        },
                    ),
                )
            }.body<AuthMeResponse>().toAuthMe()
        }
    }

    override suspend fun bindEmail(accessToken: String, email: String): AuthMe {
        return executeCall {
            client.patch {
                url("api/v1/auth/me/email")
                contentType(ContentType.Application.Json)
                headers {
                    append(HttpHeaders.Authorization, "Bearer $accessToken")
                }
                setBody(EmailBindPayload(email = email))
            }.body<AuthMeResponse>().toAuthMe()
        }
    }

    override suspend fun changePassword(
        accessToken: String,
        currentPassword: String,
        newPassword: String,
    ): AuthMe {
        return executeCall {
            client.patch {
                url("api/v1/auth/me/password")
                contentType(ContentType.Application.Json)
                headers {
                    append(HttpHeaders.Authorization, "Bearer $accessToken")
                }
                setBody(
                    PasswordChangePayload(
                        currentPassword = currentPassword,
                        newPassword = newPassword,
                    )
                )
            }.body<AuthMeResponse>().toAuthMe()
        }
    }

    override suspend fun updateAccountSettings(
        accessToken: String,
        learningRemindersEnabled: Boolean?,
        securityAlertsEnabled: Boolean?,
        profileVisible: Boolean?,
    ): AuthMe {
        return executeCall {
            client.patch {
                url("api/v1/auth/me/account-settings")
                contentType(ContentType.Application.Json)
                headers {
                    append(HttpHeaders.Authorization, "Bearer $accessToken")
                }
                setBody(
                    AccountSettingsPayload(
                        learningRemindersEnabled = learningRemindersEnabled,
                        securityAlertsEnabled = securityAlertsEnabled,
                        profileVisible = profileVisible,
                    )
                )
            }.body<AuthMeResponse>().toAuthMe()
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
        initialLogin = initialLogin,
        initialPassword = initialPassword,
    )
}

private fun AuthMeResponse.toAuthMe(): AuthMe {
    return AuthMe(
        userId = userId,
        role = role,
        status = status,
        displayName = displayName,
        email = email,
        avatarKey = avatarKey,
        avatarUrl = avatarUrl,
        learningRemindersEnabled = learningRemindersEnabled,
        securityAlertsEnabled = securityAlertsEnabled,
        profileVisible = profileVisible,
        permissions = permissions,
    )
}

private fun PasswordRecoveryRequestResponse.toPasswordRecoveryRequest(): PasswordRecoveryRequest {
    return PasswordRecoveryRequest(debugResetToken = debugResetToken)
}
