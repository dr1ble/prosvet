package com.digitaledu.feature.auth.impl

sealed interface RecoveryIntent {
    data class LoginOrEmailChanged(val value: String) : RecoveryIntent
    data class SubmitClicked(val infoMessage: String) : RecoveryIntent
}
