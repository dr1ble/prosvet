package com.digitaledu.feature.player.impl.domain

internal data class SavedCourseProgress(
    val currentScreenIndex: Int,
    val completedScreens: Set<Int>,
)
