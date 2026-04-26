package com.digitaledu.feature.auth.impl

import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.common.toUserMessage
import com.digitaledu.core.data.auth.AuthRepository

class RegistrationViewModel(
    private val authRepository: AuthRepository,
) :
    BaseViewModel<RegistrationUiState, RegistrationIntent, RegistrationEffect>(RegistrationUiState()) {

    override suspend fun handleIntent(intent: RegistrationIntent) {
        when (intent) {
            is RegistrationIntent.FullNameChanged -> updateState {
                copy(fullName = intent.value, infoMessage = null)
            }

            is RegistrationIntent.LoginChanged -> updateState {
                copy(login = intent.value, infoMessage = null)
            }

            is RegistrationIntent.PasswordChanged -> updateState {
                copy(password = intent.value, infoMessage = null)
            }

            is RegistrationIntent.ConfirmPasswordChanged -> updateState {
                copy(confirmPassword = intent.value, infoMessage = null)
            }

            RegistrationIntent.SubmitClicked -> submit()
            RegistrationIntent.DismissError -> dismissError()
        }
    }

    private suspend fun submit() {
        if (!currentState.canSubmit) return

        updateState { copy(isSubmitting = true, infoMessage = null) }

        runCatching {
            authRepository.register(
                fullName = currentState.fullName,
                login = currentState.login,
                password = currentState.password,
            )
        }.onSuccess {
            updateState { copy(isSubmitting = false, infoMessage = null) }
            emitEffect(RegistrationEffect.Registered)
        }.onFailure { throwable ->
            updateState {
                copy(
                    isSubmitting = false,
                    infoMessage = throwable.toUserMessage(),
                )
            }
        }
    }

    private fun dismissError() {
        updateState { copy(infoMessage = null) }
    }
}
