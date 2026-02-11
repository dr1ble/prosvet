package com.digitaledu.feature.auth.impl

data class AuthUiState(
    val login: String = "",
    val password: String = "",
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null,
) {
    val isLoginEnabled: Boolean
        get() = login.isNotBlank() && password.length >= 6 && !isSubmitting
}
