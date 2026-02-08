package com.digitaledu.feature.auth.impl

data class AuthUiState(
    val phoneNumber: String = "",
    val otpCode: String = "",
    val challengeId: String? = null,
    val devCode: String? = null,
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null,
) {
    val isRequestEnabled: Boolean
        get() = phoneNumber.filter(Char::isDigit).length >= 10 && !isSubmitting

    val isVerifyEnabled: Boolean
        get() = otpCode.filter(Char::isDigit).length in 4..8 && !isSubmitting

    val isOtpRequested: Boolean
        get() = challengeId != null
}
