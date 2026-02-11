package com.digitaledu.feature.home.impl.profile

sealed interface ProfileIntent {
    data object Logout : ProfileIntent
    data object DismissError : ProfileIntent
}
