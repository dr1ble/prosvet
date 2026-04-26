package com.digitaledu.feature.auth.impl

data class RecoveryUiState(
    val loginOrEmail: String = "",
    val resetToken: String = "",
    val newPassword: String = "",
    val confirmPassword: String = "",
    val isSubmitting: Boolean = false,
    val isResetRequested: Boolean = false,
    val infoMessage: String? = null,
    val errorMessage: String? = null,
) {
    val canSubmit: Boolean
        get() = loginOrEmail.isNotBlank() && !isSubmitting

    val passwordsMatch: Boolean
        get() = newPassword == confirmPassword

    val canConfirm: Boolean
        get() = resetToken.isNotBlank() &&
            newPassword.length >= 8 &&
            passwordsMatch &&
            !isSubmitting
}
