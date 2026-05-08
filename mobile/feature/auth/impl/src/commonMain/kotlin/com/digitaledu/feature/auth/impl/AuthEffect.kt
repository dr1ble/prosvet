package com.digitaledu.feature.auth.impl

import com.digitaledu.core.model.auth.AuthTokens

sealed interface AuthEffect {
    data object Authenticated : AuthEffect
    data class InitialCredentialsReady(
        val login: String,
        val password: String,
    ) : AuthEffect
}

internal fun qrAuthEffectFor(tokens: AuthTokens): AuthEffect {
    val initialLogin = tokens.initialLogin
    val initialPassword = tokens.initialPassword
    if (!initialLogin.isNullOrBlank() && !initialPassword.isNullOrBlank()) {
        return AuthEffect.InitialCredentialsReady(
            login = initialLogin,
            password = initialPassword,
        )
    }
    return AuthEffect.Authenticated
}
