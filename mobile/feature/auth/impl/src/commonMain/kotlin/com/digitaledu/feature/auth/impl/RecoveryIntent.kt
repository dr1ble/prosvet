package com.digitaledu.feature.auth.impl

sealed interface RecoveryIntent {
    data class LoginOrEmailChanged(val value: String) : RecoveryIntent
    data class SubmitClicked(val infoMessage: String) : RecoveryIntent
    data class ResetTokenChanged(val value: String) : RecoveryIntent
    data class NewPasswordChanged(val value: String) : RecoveryIntent
    data class ConfirmPasswordChanged(val value: String) : RecoveryIntent
    data class ConfirmClicked(val infoMessage: String) : RecoveryIntent
    data object DismissError : RecoveryIntent
}
