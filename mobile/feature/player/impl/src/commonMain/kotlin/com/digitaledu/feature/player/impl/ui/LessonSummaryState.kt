package com.digitaledu.feature.player.impl.ui

import com.digitaledu.core.model.catalog.CatalogCourse
import com.digitaledu.core.model.catalog.CatalogScreen
import kotlin.math.roundToInt

internal data class LessonSummaryState(
    val courseTitle: String,
    val lessonTitle: String,
    val completedSteps: Int,
    val totalSteps: Int,
    val progressPercent: Int,
    val isCourseComplete: Boolean,
    val hasNextLesson: Boolean,
    val nextLessonTitle: String?,
)

internal fun buildLessonSummaryState(
    course: CatalogCourse,
    screens: List<CatalogScreen>,
    currentScreenIndex: Int,
): LessonSummaryState {
    val totalSteps = screens.size.coerceAtLeast(1)
    val normalizedIndex = currentScreenIndex.coerceIn(0, totalSteps - 1)
    val completedSteps = (normalizedIndex + 1).coerceAtMost(totalSteps)
    val nextScreen = screens.getOrNull(normalizedIndex + 1)

    return LessonSummaryState(
        courseTitle = course.title,
        lessonTitle = screens.getOrNull(normalizedIndex)?.title ?: course.title,
        completedSteps = completedSteps,
        totalSteps = totalSteps,
        progressPercent = (completedSteps.toFloat() / totalSteps.toFloat() * 100).roundToInt().coerceIn(0, 100),
        isCourseComplete = completedSteps == totalSteps,
        hasNextLesson = nextScreen != null,
        nextLessonTitle = nextScreen?.title,
    )
}
