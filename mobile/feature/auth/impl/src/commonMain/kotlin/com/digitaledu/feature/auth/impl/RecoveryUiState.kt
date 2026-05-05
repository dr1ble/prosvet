package com.digitaledu.feature.auth.impl

internal const val RESET_CODE_LENGTH = 6
internal const val RESET_CODE_VALIDATION_MESSAGE = "Код должен состоять из 6 цифр"

data class RecoveryUiState(
    val loginOrEmail: String = "",
    val resetToken: String = "",
    val newPassword: String = "",
    val isSubmitting: Boolean = false,
    val isResetRequested: Boolean = false,
    val infoMessage: String? = null,
    val errorMessage: String? = null,
) {
    val canSubmit: Boolean
        get() = loginOrEmail.isNotBlank() && !isSubmitting

    val isResetCodeValid: Boolean
        get() = resetToken.length == RESET_CODE_LENGTH && resetToken.all(Char::isDigit)

    val resetCodeValidationMessage: String?
        get() = if (resetToken.isNotEmpty() && !isResetCodeValid) {
            RESET_CODE_VALIDATION_MESSAGE
        } else {
            null
        }

    val passwordValidationMessage: String?
        get() = if (newPassword.isNotEmpty() && newPassword.length < MIN_PASSWORD_LENGTH) {
            PASSWORD_MIN_LENGTH_MESSAGE
        } else {
            null
        }

    val canConfirm: Boolean
        get() = isResetCodeValid &&
            newPassword.length >= MIN_PASSWORD_LENGTH &&
            !isSubmitting
}
