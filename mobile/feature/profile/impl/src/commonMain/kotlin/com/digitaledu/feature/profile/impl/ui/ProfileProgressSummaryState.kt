package com.digitaledu.feature.profile.impl.ui

import com.digitaledu.core.model.progress.CourseProgressInfo
import kotlin.math.roundToInt

internal enum class ProfileAchievementKind {
    FirstCourseCompleted,
    FavoritesCollector,
    DictionaryStarted,
    NotesStarted,
}

internal data class ProfileAchievementState(
    val kind: ProfileAchievementKind,
    val isUnlocked: Boolean,
)

internal data class ProfileProgressSummaryState(
    val totalLessons: Int,
    val completedLessons: Int,
    val completedCourses: Int,
    val progressPercent: Int,
    val achievements: List<ProfileAchievementState>,
)

internal fun buildProfileProgressSummaryState(
    courseProgress: List<CourseProgressInfo>,
    favoriteCourseCount: Int,
    glossaryTermCount: Int,
    noteCount: Int,
): ProfileProgressSummaryState {
    val totalLessons = courseProgress.sumOf { course -> course.totalLessons.coerceAtLeast(0) }
    val completedLessons = courseProgress.sumOf { course ->
        course.completedLessons.coerceIn(0, course.totalLessons.coerceAtLeast(0))
    }
    val completedCourses = courseProgress.count { course ->
        course.totalLessons > 0 && course.completedLessons >= course.totalLessons
    }
    val progressPercent = if (totalLessons == 0) {
        0
    } else {
        (completedLessons.toFloat() / totalLessons.toFloat() * 100).roundToInt().coerceIn(0, 100)
    }

    return ProfileProgressSummaryState(
        totalLessons = totalLessons,
        completedLessons = completedLessons,
        completedCourses = completedCourses,
        progressPercent = progressPercent,
        achievements = listOf(
            ProfileAchievementState(
                kind = ProfileAchievementKind.FirstCourseCompleted,
                isUnlocked = completedCourses > 0,
            ),
            ProfileAchievementState(
                kind = ProfileAchievementKind.FavoritesCollector,
                isUnlocked = favoriteCourseCount > 0,
            ),
            ProfileAchievementState(
                kind = ProfileAchievementKind.DictionaryStarted,
                isUnlocked = glossaryTermCount > 0,
            ),
            ProfileAchievementState(
                kind = ProfileAchievementKind.NotesStarted,
                isUnlocked = noteCount > 0,
            ),
        ),
    )
}
