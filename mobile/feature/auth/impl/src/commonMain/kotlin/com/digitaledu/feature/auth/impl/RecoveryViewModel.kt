package com.digitaledu.feature.auth.impl

import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.common.toUserMessage
import com.digitaledu.core.data.auth.AuthRepository

class RecoveryViewModel(
    private val authRepository: AuthRepository,
) :
    BaseViewModel<RecoveryUiState, RecoveryIntent, RecoveryEffect>(RecoveryUiState()) {

    override suspend fun handleIntent(intent: RecoveryIntent) {
        when (intent) {
            is RecoveryIntent.LoginOrEmailChanged -> updateState {
                copy(loginOrEmail = intent.value, infoMessage = null, errorMessage = null)
            }

            is RecoveryIntent.SubmitClicked -> submit(intent.infoMessage)
            is RecoveryIntent.ResetTokenChanged -> updateState {
                copy(
                    resetToken = intent.value.filter(Char::isDigit).take(RESET_CODE_LENGTH),
                    infoMessage = null,
                    errorMessage = null,
                )
            }
            is RecoveryIntent.NewPasswordChanged -> updateState {
                copy(newPassword = intent.value, infoMessage = null, errorMessage = null)
            }
            is RecoveryIntent.ConfirmPasswordChanged -> updateState {
                copy(infoMessage = null, errorMessage = null)
            }
            is RecoveryIntent.ConfirmClicked -> confirm(intent.infoMessage)
            RecoveryIntent.DismissError -> updateState { copy(errorMessage = null) }
        }
    }

    private suspend fun submit(infoMessage: String) {
        if (!currentState.canSubmit) return

        updateState { copy(isSubmitting = true, infoMessage = null, errorMessage = null) }
        runCatching {
            authRepository.requestPasswordRecovery(currentState.loginOrEmail)
        }.onSuccess {
            updateState {
                copy(
                    isSubmitting = false,
                    isResetRequested = true,
                    resetToken = "",
                    infoMessage = infoMessage,
                )
            }
            emitEffect(RecoveryEffect.Sent)
        }.onFailure { throwable ->
            updateState {
                copy(
                    isSubmitting = false,
                    errorMessage = throwable.toUserMessage(),
                )
            }
        }
    }

    private suspend fun confirm(infoMessage: String) {
        if (!currentState.canConfirm) return

        updateState { copy(isSubmitting = true, infoMessage = null, errorMessage = null) }
        runCatching {
            authRepository.confirmPasswordRecovery(
                resetToken = currentState.resetToken,
                newPassword = currentState.newPassword,
            )
        }.onSuccess {
            updateState {
                copy(
                    isSubmitting = false,
                    isResetRequested = false,
                    resetToken = "",
                    newPassword = "",
                    infoMessage = infoMessage,
                )
            }
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
