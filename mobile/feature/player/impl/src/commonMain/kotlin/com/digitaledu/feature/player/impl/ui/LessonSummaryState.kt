package com.digitaledu.feature.player.impl.ui

import com.digitaledu.core.model.catalog.CatalogCourse
import com.digitaledu.core.model.catalog.CatalogScreen
import com.digitaledu.core.model.content.ArticlePayload
import com.digitaledu.core.model.content.CheatSheetPayload
import com.digitaledu.core.model.content.QuizPayload
import com.digitaledu.core.model.content.SimulationPayload
import com.digitaledu.core.model.content.UnknownPayload
import com.digitaledu.core.model.content.VideoPayload
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
    val normalizedIndex = currentScreenIndex.coerceIn(0, screens.lastIndex.coerceAtLeast(0))
    val playableScreens = screens.filter(CatalogScreen::isPlayableSummaryStep)
    val totalSteps = playableScreens.size.coerceAtLeast(1)
    val completedSteps = screens
        .take(normalizedIndex + 1)
        .count(CatalogScreen::isPlayableSummaryStep)
        .coerceIn(1, totalSteps)
    val nextScreen = screens
        .drop(normalizedIndex + 1)
        .firstOrNull(CatalogScreen::isPlayableSummaryStep)

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

private fun CatalogScreen.isPlayableSummaryStep(): Boolean {
    return when (val screenPayload = payload) {
        is ArticlePayload -> screenPayload.markdownContent.isNotBlank()
        is CheatSheetPayload -> screenPayload.content.isNotBlank()
        is QuizPayload -> screenPayload.questions.isNotEmpty()
        is SimulationPayload -> screenPayload.imageUrl.isNotBlank() || screenPayload.hotspots.isNotEmpty()
        is UnknownPayload -> false
        is VideoPayload -> screenPayload.videoUrl.isNotBlank()
    }
}
