package com.digitaledu.feature.auth.impl

sealed interface RegistrationIntent {
    data class FullNameChanged(val value: String) : RegistrationIntent
    data class LoginChanged(val value: String) : RegistrationIntent
    data class PasswordChanged(val value: String) : RegistrationIntent
    data class ConfirmPasswordChanged(val value: String) : RegistrationIntent
    data object SubmitClicked : RegistrationIntent
}
