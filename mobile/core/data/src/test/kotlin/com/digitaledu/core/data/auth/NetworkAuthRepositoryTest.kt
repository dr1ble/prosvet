package com.digitaledu.core.data.auth

import com.digitaledu.core.model.AuthTokens
import com.digitaledu.core.model.OtpChallenge
import com.digitaledu.core.network.AuthNetworkDataSource
import com.digitaledu.core.network.NetworkException
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.fail
import org.junit.Test

class NetworkAuthRepositoryTest {
    @Test
    fun withFreshAccessToken_returnsImmediately_whenRequestSucceeds() = runBlocking {
        val sessionStore = InMemoryAuthSessionStore().apply {
            update(AuthTokens(accessToken = "access-1", refreshToken = "refresh-1"))
        }
        val network = FakeAuthNetworkDataSource()
        val repository = NetworkAuthRepository(
            networkDataSource = network,
            authSessionStore = sessionStore,
        )

        val result = repository.withFreshAccessToken { token ->
            "Bearer $token"
        }

        assertEquals("Bearer access-1", result)
        assertEquals(0, network.refreshCalls)
    }

    @Test
    fun withFreshAccessToken_refreshesAndRetries_whenFirstRequestIsUnauthorized() = runBlocking {
        val sessionStore = InMemoryAuthSessionStore().apply {
            update(AuthTokens(accessToken = "access-1", refreshToken = "refresh-1"))
        }
        val network = FakeAuthNetworkDataSource().apply {
            refreshResult = AuthTokens(
                accessToken = "access-2",
                refreshToken = "refresh-2",
            )
        }
        val repository = NetworkAuthRepository(
            networkDataSource = network,
            authSessionStore = sessionStore,
        )
        var calls = 0

        val result = repository.withFreshAccessToken { token ->
            calls += 1
            if (calls == 1) {
                throw NetworkException(
                    message = "Unauthorized",
                    statusCode = 401,
                )
            }
            token
        }

        assertEquals("access-2", result)
        assertEquals(1, network.refreshCalls)
        assertEquals("access-2", sessionStore.current()?.accessToken)
    }

    @Test
    fun withFreshAccessToken_throwsAndClearsSession_whenRefreshFails() = runBlocking {
        val sessionStore = InMemoryAuthSessionStore().apply {
            update(AuthTokens(accessToken = "access-1", refreshToken = "refresh-1"))
        }
        val network = FakeAuthNetworkDataSource().apply {
            refreshFailure = NetworkException(
                message = "Unauthorized refresh",
                statusCode = 401,
            )
        }
        val repository = NetworkAuthRepository(
            networkDataSource = network,
            authSessionStore = sessionStore,
        )

        val exception = runCatching {
            repository.withFreshAccessToken { _ ->
                throw NetworkException(
                    message = "Unauthorized",
                    statusCode = 401,
                )
            }
        }.exceptionOrNull() as? NetworkException ?: run {
            fail("Expected NetworkException")
            return@runBlocking
        }

        assertEquals("Сессия истекла, войдите снова", exception.message)
        assertEquals(401, exception.statusCode)
        assertNull(sessionStore.current())
        assertEquals(1, network.refreshCalls)
    }

    @Test
    fun withFreshAccessToken_throws_whenNoActiveSession() = runBlocking {
        val repository = NetworkAuthRepository(
            networkDataSource = FakeAuthNetworkDataSource(),
            authSessionStore = InMemoryAuthSessionStore(),
        )

        val exception = runCatching {
            repository.withFreshAccessToken { "unused" }
        }.exceptionOrNull() as? NetworkException ?: run {
            fail("Expected NetworkException")
            return@runBlocking
        }

        assertEquals("Требуется авторизация", exception.message)
        assertEquals(null, exception.statusCode)
    }
}

private class FakeAuthNetworkDataSource : AuthNetworkDataSource {
    var refreshResult: AuthTokens? = null
    var refreshFailure: Throwable? = null
    var refreshCalls: Int = 0

    override suspend fun requestOtp(phoneNumber: String): OtpChallenge {
        throw UnsupportedOperationException("Not needed in this test")
    }

    override suspend fun verifyOtp(phoneNumber: String, code: String): AuthTokens {
        throw UnsupportedOperationException("Not needed in this test")
    }

    override suspend fun refreshSession(refreshToken: String): AuthTokens {
        refreshCalls += 1
        refreshFailure?.let { throw it }
        return refreshResult ?: error("refreshResult must be provided")
    }

    override suspend fun logout(refreshToken: String) {
        // No-op for tests.
    }
}
