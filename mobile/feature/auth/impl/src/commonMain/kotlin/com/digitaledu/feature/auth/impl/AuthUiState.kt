package com.digitaledu.feature.auth.impl

internal const val MIN_PASSWORD_LENGTH = 6
internal const val PASSWORD_MIN_LENGTH_MESSAGE = "Введите минимум 6 символов"

data class AuthUiState(
    val login: String = "",
    val password: String = "",
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null,
    val debugQuickLoginConfig: DebugQuickLoginConfig = DebugQuickLoginConfig(),
) {
    val passwordValidationMessage: String?
        get() = if (password.isNotEmpty() && password.length < MIN_PASSWORD_LENGTH) {
            PASSWORD_MIN_LENGTH_MESSAGE
        } else {
            null
        }

    val isLoginEnabled: Boolean
        get() = login.isNotBlank() && password.length >= MIN_PASSWORD_LENGTH && !isSubmitting
}
