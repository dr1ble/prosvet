package com.digitaledu.feature.auth.impl

import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.common.PhoneNumberFormatter
import com.digitaledu.core.common.toUserMessage
import com.digitaledu.core.data.auth.AuthRepository

class AuthViewModel(
    private val authRepository: AuthRepository,
) : BaseViewModel<AuthUiState, AuthIntent, AuthEffect>(AuthUiState()) {

    override suspend fun handleIntent(intent: AuthIntent) {
        when (intent) {
            is AuthIntent.LoginChanged -> onLoginChanged(intent.value)
            is AuthIntent.PasswordChanged -> onPasswordChanged(intent.value)
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

    private suspend fun login() {
        if (!currentState.isLoginEnabled) return

        updateState {
            copy(
                isSubmitting = true,
                errorMessage = null,
            )
        }

        runCatching {
            authRepository.login(
                login = currentState.login,
                password = currentState.password,
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
