package com.digitaledu.core.data.auth

import com.digitaledu.core.model.auth.AuthTokens
import com.digitaledu.core.model.auth.AuthMe
import com.digitaledu.core.model.auth.PasswordRecoveryRequest
import com.digitaledu.core.network.AuthNetworkDataSource
import com.digitaledu.core.network.NetworkException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

class NetworkAuthRepository(
    private val networkDataSource: AuthNetworkDataSource,
    private val authSessionStore: AuthSessionStore,
) : AuthRepository {
    override suspend fun register(fullName: String, login: String, password: String): AuthTokens {
        val tokens = networkDataSource.register(
            fullName = fullName,
            login = login,
            password = password,
        )
        authSessionStore.update(tokens)
        return tokens
    }

    override suspend fun login(login: String, password: String): AuthTokens {
        val tokens = networkDataSource.login(
            login = login,
            password = password,
        )
        authSessionStore.update(tokens)
        return tokens
    }

    override suspend fun activateQr(token: String): AuthTokens {
        val tokens = networkDataSource.activateQr(token = token)
        authSessionStore.update(tokens)
        return tokens
    }

    override suspend fun requestPasswordRecovery(loginOrEmail: String): PasswordRecoveryRequest {
        return networkDataSource.requestPasswordRecovery(loginOrEmail = loginOrEmail)
    }

    override suspend fun confirmPasswordRecovery(resetToken: String, newPassword: String) {
        networkDataSource.confirmPasswordRecovery(
            resetToken = resetToken,
            newPassword = newPassword,
        )
    }

    override suspend fun refreshSession(): Boolean {
        val cachedTokens = authSessionStore.current() ?: return false
        return runCatching {
            networkDataSource.refreshSession(refreshToken = cachedTokens.refreshToken)
        }.onSuccess { refreshedTokens ->
            authSessionStore.update(refreshedTokens)
        }.onFailure {
            authSessionStore.clear()
        }.isSuccess
    }

    override suspend fun restoreSession(): Boolean {
        return refreshSession()
    }

    override suspend fun logout() {
        val cachedTokens = authSessionStore.current()
        if (cachedTokens != null) {
            runCatching {
                networkDataSource.logout(refreshToken = cachedTokens.refreshToken)
            }
        }
        authSessionStore.clear()
    }

    override suspend fun getCurrentUser(): AuthMe {
        return withFreshAccessToken { accessToken ->
            networkDataSource.getCurrentUser(accessToken = accessToken)
        }
    }

    override suspend fun updateCurrentUser(displayName: String?, avatarKey: String?): AuthMe {
        return withFreshAccessToken { accessToken ->
            networkDataSource.updateCurrentUser(
                accessToken = accessToken,
                displayName = displayName,
                avatarKey = avatarKey,
            )
        }
    }

    override suspend fun uploadAvatar(filename: String, contentType: String, content: ByteArray): AuthMe {
        return withFreshAccessToken { accessToken ->
            networkDataSource.uploadAvatar(
                accessToken = accessToken,
                filename = filename,
                contentType = contentType,
                content = content,
            )
        }
    }

    override suspend fun bindEmail(email: String): AuthMe {
        return withFreshAccessToken { accessToken ->
            networkDataSource.bindEmail(accessToken = accessToken, email = email)
        }
    }

    override suspend fun changePassword(currentPassword: String, newPassword: String): AuthMe {
        return withFreshAccessToken { accessToken ->
            networkDataSource.changePassword(
                accessToken = accessToken,
                currentPassword = currentPassword,
                newPassword = newPassword,
            )
        }
    }

    override suspend fun updateAccountSettings(
        learningRemindersEnabled: Boolean?,
        securityAlertsEnabled: Boolean?,
        profileVisible: Boolean?,
    ): AuthMe {
        return withFreshAccessToken { accessToken ->
            networkDataSource.updateAccountSettings(
                accessToken = accessToken,
                learningRemindersEnabled = learningRemindersEnabled,
                securityAlertsEnabled = securityAlertsEnabled,
                profileVisible = profileVisible,
            )
        }
    }

    override suspend fun <T> withFreshAccessToken(
        block: suspend (accessToken: String) -> T,
    ): T {
        val initialToken = authSessionStore.current()?.accessToken
            ?: throw NetworkException(message = NO_ACTIVE_SESSION_MESSAGE)

        return runCatching {
            block(initialToken)
        }.recoverCatching { throwable ->
            if (!throwable.isUnauthorized()) throw throwable

            val refreshed = refreshSession()
            if (!refreshed) {
                throw NetworkException(
                    message = SESSION_EXPIRED_MESSAGE,
                    statusCode = UNAUTHORIZED_STATUS_CODE,
                    cause = throwable,
                )
            }
            val refreshedAccessToken = authSessionStore.current()?.accessToken
                ?: throw NetworkException(
                    message = NO_ACTIVE_SESSION_MESSAGE,
                    cause = throwable,
                )
            block(refreshedAccessToken)
        }.getOrThrow()
    }

    override fun getCachedTokens(): AuthTokens? {
        return authSessionStore.current()
    }

    override fun observeTokens(): Flow<AuthTokens?> {
        return authSessionStore.observe()
    }

    override fun clearSession() {
        authSessionStore.clear()
    }

    private fun Throwable.isUnauthorized(): Boolean {
        return (this as? NetworkException)?.statusCode == UNAUTHORIZED_STATUS_CODE
    }

    private companion object {
        const val UNAUTHORIZED_STATUS_CODE = 401
        const val NO_ACTIVE_SESSION_MESSAGE = "Требуется авторизация"
        const val SESSION_EXPIRED_MESSAGE = "Сессия истекла, войдите снова"
    }
}

interface AuthSessionStore {
    fun current(): AuthTokens?
    fun observe(): Flow<AuthTokens?>
    fun update(tokens: AuthTokens)
    fun clear()
}

class InMemoryAuthSessionStore : AuthSessionStore {
    private val state = MutableStateFlow<AuthTokens?>(null)

    override fun current(): AuthTokens? = state.value

    override fun observe(): Flow<AuthTokens?> = state

    override fun update(tokens: AuthTokens) {
        state.value = tokens
    }

    override fun clear() {
        state.value = null
    }
}
