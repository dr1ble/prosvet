package com.digitaledu.feature.auth.impl

import androidx.lifecycle.viewModelScope
import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.common.toUserMessage
import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.data.preferences.AccessibilityPreferencesRepository
import com.digitaledu.core.model.preferences.AccessibilitySettings
import kotlinx.coroutines.launch

class AuthViewModel(
    private val authRepository: AuthRepository,
    private val accessibilityPreferencesRepository: AccessibilityPreferencesRepository,
    private val debugQuickLoginConfig: DebugQuickLoginConfig,
) : BaseViewModel<AuthUiState, AuthIntent, AuthEffect>(
    AuthUiState(debugQuickLoginConfig = debugQuickLoginConfig),
) {

    override suspend fun handleIntent(intent: AuthIntent) {
        when (intent) {
            is AuthIntent.LoginChanged -> onLoginChanged(intent.value)
            is AuthIntent.PasswordChanged -> onPasswordChanged(intent.value)
            is AuthIntent.DebugQuickLoginClicked -> login(
                login = intent.preset.login,
                password = intent.preset.password,
            )
            AuthIntent.LoginClicked -> login()
        }
    }

    private fun onLoginChanged(value: String) {
        updateState {
            copy(
                login = value,
                errorMessage = null,
            )
        }
    }

    private fun onPasswordChanged(value: String) {
        updateState {
            copy(
                password = value,
                errorMessage = null,
            )
        }
    }

    fun updateAccessibility(transform: AccessibilitySettings.() -> AccessibilitySettings) {
        viewModelScope.launch {
            accessibilityPreferencesRepository.update(transform)
        }
    }

    private suspend fun login(
        login: String = currentState.login,
        password: String = currentState.password,
    ) {
        if (login.isBlank() || password.length < 6 || currentState.isSubmitting) return

        updateState {
            copy(
                login = login,
                password = password,
                isSubmitting = true,
                errorMessage = null,
            )
        }

        runCatching {
            authRepository.login(
                login = login,
                password = password,
            )
        }.onSuccess {
            updateState { copy(isSubmitting = false) }
            emitEffect(AuthEffect.Authenticated)
        }.onFailure { throwable ->
            updateState {
                copy(
                    isSubmitting = false,
                    errorMessage = throwable.toUserMessage(),
                )
            }
        }
    }
}
