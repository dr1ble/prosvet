package com.digitaledu.feature.auth.impl

data class RegistrationUiState(
    val fullName: String = "",
    val login: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val isSubmitting: Boolean = false,
    val infoMessage: String? = null,
) {
    val passwordValidationMessage: String?
        get() = if (password.isNotEmpty() && password.length < MIN_PASSWORD_LENGTH) {
            PASSWORD_MIN_LENGTH_MESSAGE
        } else {
            null
        }

    val passwordsMatch: Boolean
        get() = password == confirmPassword

    val canSubmit: Boolean
        get() = fullName.isNotBlank() &&
            login.isNotBlank() &&
            password.length >= MIN_PASSWORD_LENGTH &&
            passwordsMatch &&
            !isSubmitting
}
