package com.digitaledu.feature.auth.impl

data class RegistrationUiState(
    val fullName: String = "",
    val login: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val isSubmitting: Boolean = false,
    val infoMessage: String? = null,
) {
    val passwordsMatch: Boolean
        get() = password == confirmPassword

    val canSubmit: Boolean
        get() = fullName.isNotBlank() &&
            login.isNotBlank() &&
            password.length >= 8 &&
            passwordsMatch &&
            !isSubmitting
}
