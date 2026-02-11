package com.digitaledu.feature.auth.impl

sealed interface AuthEffect {
    data object Authenticated : AuthEffect
}
