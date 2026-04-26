package com.digitaledu.feature.profile.api

sealed interface ProfileIntent {
    data object Logout : ProfileIntent
    data object DismissError : ProfileIntent
    data object DismissSuccess : ProfileIntent
    data class BindEmail(val email: String) : ProfileIntent
    data object ResetAccessibility : ProfileIntent
    data class SetFontScale(val value: Float) : ProfileIntent
    data class SetControlScale(val value: Float) : ProfileIntent
    data class SetBoldText(val enabled: Boolean) : ProfileIntent
    data class SetHighContrast(val enabled: Boolean) : ProfileIntent
    data class SetVoiceSupport(val enabled: Boolean) : ProfileIntent
    data class SetTremorFilter(val enabled: Boolean) : ProfileIntent
}
