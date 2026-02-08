package com.digitaledu.feature.auth.impl

sealed interface AuthEvent {
    data object Authenticated : AuthEvent
}
