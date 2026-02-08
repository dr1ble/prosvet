package com.digitaledu.feature.auth.impl

sealed interface AuthAction {
    data class PhoneChanged(val value: String) : AuthAction
    data class OtpCodeChanged(val value: String) : AuthAction
    data object RequestOtpClicked : AuthAction
    data object VerifyOtpClicked : AuthAction
    data object ChangePhoneClicked : AuthAction
}
