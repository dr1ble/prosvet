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
            is AuthIntent.PhoneChanged -> onPhoneChanged(intent.value)
            is AuthIntent.OtpCodeChanged -> onOtpCodeChanged(intent.value)
            AuthIntent.RequestOtpClicked -> requestOtp()
            AuthIntent.VerifyOtpClicked -> verifyOtp()
            AuthIntent.ChangePhoneClicked -> resetOtpStep()
        }
    }

    private fun onPhoneChanged(value: String) {
        updateState {
            copy(
                phoneNumber = value,
                errorMessage = null,
            )
        }
    }

    private fun onOtpCodeChanged(value: String) {
        updateState {
            copy(
                otpCode = value,
                errorMessage = null,
            )
        }
    }

    private suspend fun requestOtp() {
        val normalizedPhoneNumber = PhoneNumberFormatter.normalize(currentState.phoneNumber)
        if (normalizedPhoneNumber.length < 10) {
            updateState {
                copy(errorMessage = "Введите корректный номер телефона")
            }
            return
        }

        updateState {
            copy(
                isSubmitting = true,
                errorMessage = null,
            )
        }

        runCatching {
            authRepository.requestOtp(phoneNumber = currentState.phoneNumber)
        }.onSuccess { challenge ->
            updateState {
                copy(
                    isSubmitting = false,
                    challengeId = challenge.challengeId,
                    devCode = challenge.devCode,
                    otpCode = "",
                    errorMessage = null,
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

    private suspend fun verifyOtp() {
        if (currentState.otpCode.filter(Char::isDigit).length !in 4..8) {
            updateState {
                copy(errorMessage = "Введите корректный код подтверждения")
            }
            return
        }

        updateState {
            copy(
                isSubmitting = true,
                errorMessage = null,
            )
        }

        runCatching {
            authRepository.verifyOtp(
                phoneNumber = currentState.phoneNumber,
                code = currentState.otpCode,
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

    private fun resetOtpStep() {
        updateState {
            copy(
                otpCode = "",
                challengeId = null,
                devCode = null,
                errorMessage = null,
            )
        }
    }
}
