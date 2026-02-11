package com.digitaledu.feature.home.impl.profile

sealed interface ProfileEffect {
    data object LoggedOut : ProfileEffect
}
