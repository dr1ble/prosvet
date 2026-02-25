package com.digitaledu.feature.profile.api

sealed interface ProfileIntent {
    data object Logout : ProfileIntent
    data object DismissError : ProfileIntent
}
