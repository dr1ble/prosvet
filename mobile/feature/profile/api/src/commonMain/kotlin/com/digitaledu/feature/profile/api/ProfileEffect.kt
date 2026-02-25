package com.digitaledu.feature.profile.api

sealed interface ProfileEffect {
    data object LoggedOut : ProfileEffect
}
