package com.digitaledu.feature.player.impl.domain

import com.digitaledu.core.model.catalog.CatalogBundle

internal class ResolveCompletedLessonIdUseCase {
    operator fun invoke(
        bundle: CatalogBundle,
        sourceIndex: Int,
        targetIndex: Int,
    ): String? {
        if (targetIndex <= sourceIndex) return null

        val sourceLessonId = bundle.screens.getOrNull(sourceIndex)?.lessonId ?: return null
        val targetLessonId = bundle.screens.getOrNull(targetIndex)?.lessonId

        // Crossing a lesson boundary — source lesson is done.
        if (sourceLessonId != targetLessonId) {
            return sourceLessonId
        }

        // Still inside the same lesson; treat it as completed when the learner
        // reaches the final screen of the whole course.
        if (targetIndex == bundle.screens.lastIndex) {
            return sourceLessonId
        }

        return null
    }

    fun resolveOnClose(
        bundle: CatalogBundle,
        currentIndex: Int,
    ): String? {
        return bundle.screens
            .getOrNull(currentIndex)
            ?.takeIf { currentIndex == bundle.screens.lastIndex }
            ?.lessonId
    }
}
