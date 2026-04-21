package com.digitaledu.feature.auth.impl

sealed interface RecoveryEffect {
    data object Sent : RecoveryEffect
}
