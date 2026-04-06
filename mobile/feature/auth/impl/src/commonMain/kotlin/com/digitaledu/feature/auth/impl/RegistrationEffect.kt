package com.digitaledu.feature.auth.impl

sealed interface RegistrationEffect {
    data object Registered : RegistrationEffect
}
