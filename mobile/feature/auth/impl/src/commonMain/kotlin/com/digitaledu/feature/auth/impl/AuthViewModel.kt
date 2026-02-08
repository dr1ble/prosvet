package com.digitaledu.feature.auth.impl

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.common.PhoneNumberFormatter
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class AuthViewModel(
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<AuthEvent>(extraBufferCapacity = 1)
    val events: SharedFlow<AuthEvent> = _events.asSharedFlow()

    fun onAction(action: AuthAction) {
        when (action) {
            is AuthAction.PhoneChanged -> onPhoneChanged(action.value)
            is AuthAction.OtpCodeChanged -> onOtpCodeChanged(action.value)
            AuthAction.RequestOtpClicked -> requestOtp()
            AuthAction.VerifyOtpClicked -> verifyOtp()
            AuthAction.ChangePhoneClicked -> resetOtpStep()
        }
    }

    private fun onPhoneChanged(value: String) {
        _uiState.update { currentState ->
            currentState.copy(
                phoneNumber = value,
                errorMessage = null,
            )
        }
    }

    private fun onOtpCodeChanged(value: String) {
        _uiState.update { currentState ->
            currentState.copy(
                otpCode = value,
                errorMessage = null,
            )
        }
    }

    private fun requestOtp() {
        val normalizedPhoneNumber = PhoneNumberFormatter.normalize(_uiState.value.phoneNumber)
        if (normalizedPhoneNumber.length < 10) {
            _uiState.update { currentState ->
                currentState.copy(errorMessage = "Введите корректный номер телефона")
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { currentState ->
                currentState.copy(
                    isSubmitting = true,
                    errorMessage = null,
                )
            }

            runCatching {
                authRepository.requestOtp(phoneNumber = _uiState.value.phoneNumber)
            }.onSuccess { challenge ->
                _uiState.update { currentState ->
                    currentState.copy(
                        isSubmitting = false,
                        challengeId = challenge.challengeId,
                        devCode = challenge.devCode,
                        otpCode = "",
                        errorMessage = null,
                    )
                }
            }.onFailure { throwable ->
                _uiState.update { currentState ->
                    currentState.copy(
                        isSubmitting = false,
                        errorMessage = throwable.message ?: "Не удалось отправить код",
                    )
                }
            }
        }
    }

    private fun verifyOtp() {
        if (_uiState.value.otpCode.filter(Char::isDigit).length !in 4..8) {
            _uiState.update { currentState ->
                currentState.copy(errorMessage = "Введите корректный код подтверждения")
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { currentState ->
                currentState.copy(
                    isSubmitting = true,
                    errorMessage = null,
                )
            }

            runCatching {
                authRepository.verifyOtp(
                    phoneNumber = _uiState.value.phoneNumber,
                    code = _uiState.value.otpCode,
                )
            }.onSuccess {
                _uiState.update { currentState ->
                    currentState.copy(isSubmitting = false)
                }
                _events.emit(AuthEvent.Authenticated)
            }.onFailure { throwable ->
                _uiState.update { currentState ->
                    currentState.copy(
                        isSubmitting = false,
                        errorMessage = throwable.message ?: "Не удалось подтвердить код",
                    )
                }
            }
        }
    }

    private fun resetOtpStep() {
        _uiState.update { currentState ->
            currentState.copy(
                otpCode = "",
                challengeId = null,
                devCode = null,
                errorMessage = null,
            )
        }
    }

    companion object {
        fun provideFactory(authRepository: AuthRepository): ViewModelProvider.Factory {
            return viewModelFactory {
                initializer {
                    AuthViewModel(authRepository = authRepository)
                }
            }
        }
    }
}
