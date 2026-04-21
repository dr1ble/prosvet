package com.digitaledu.feature.auth.impl

data class RecoveryUiState(
    val loginOrEmail: String = "",
    val isSubmitting: Boolean = false,
    val infoMessage: String? = null,
) {
    val canSubmit: Boolean
        get() = loginOrEmail.isNotBlank() && !isSubmitting
}
