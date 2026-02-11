package com.digitaledu.feature.home.impl.player

sealed interface PlayerEffect {
    data object Closed : PlayerEffect
}
