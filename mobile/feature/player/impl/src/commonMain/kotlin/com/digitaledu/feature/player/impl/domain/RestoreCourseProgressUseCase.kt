package com.digitaledu.feature.player.impl.domain

import com.digitaledu.core.model.catalog.CatalogBundle

internal class RestoreCourseProgressUseCase {
    operator fun invoke(
        bundle: CatalogBundle,
        saved: SavedCourseProgress?,
    ): SavedCourseProgress {
        val progress = saved ?: return SavedCourseProgress(
            currentScreenIndex = 0,
            completedScreens = emptySet(),
        )

        val lastIndex = bundle.screens.lastIndex.coerceAtLeast(0)
        val restoredIndex = progress.currentScreenIndex.coerceIn(0, lastIndex)
        val validCompleted = progress.completedScreens.filterTo(mutableSetOf()) { it in 0..lastIndex }
        return SavedCourseProgress(
            currentScreenIndex = restoredIndex,
            completedScreens = validCompleted,
        )
    }
}
