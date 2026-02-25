package com.digitaledu.feature.player.impl.domain

internal class ProgressTransitionUseCase {
    operator fun invoke(
        sourceIndex: Int,
        targetIndex: Int,
        completedScreens: Set<Int>,
    ): Set<Int> {
        return if (targetIndex > sourceIndex) {
            completedScreens + sourceIndex
        } else {
            completedScreens
        }
    }
}
