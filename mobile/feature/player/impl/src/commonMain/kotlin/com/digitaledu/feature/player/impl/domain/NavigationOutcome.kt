package com.digitaledu.feature.player.impl.domain

internal data class NavigationOutcome(
    val targetIndex: Int,
    val completedScreens: Set<Int>,
)
