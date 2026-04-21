package com.digitaledu.feature.profile.api

sealed interface ProfileStatus {
    data object Idle : ProfileStatus
    data object LoggingOut : ProfileStatus
    data class Error(val message: String) : ProfileStatus
}
