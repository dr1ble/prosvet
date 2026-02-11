package com.digitaledu.feature.auth.impl

sealed interface AuthIntent {
    data class PhoneChanged(val value: String) : AuthIntent
    data class OtpCodeChanged(val value: String) : AuthIntent
    data object RequestOtpClicked : AuthIntent
    data object VerifyOtpClicked : AuthIntent
    data object ChangePhoneClicked : AuthIntent
}
