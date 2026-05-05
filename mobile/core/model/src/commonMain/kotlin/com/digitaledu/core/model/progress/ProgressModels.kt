package com.digitaledu.core.model.progress

data class MyProgress(
    val userId: String,
    val courses: List<CourseProgressInfo>,
)

data class CourseProgressInfo(
    val courseId: String,
    val courseTitle: String,
    val totalLessons: Int,
    val completedLessons: Int,
    val completionRate: Float,
)

data class LessonProgressEntry(
    val id: String,
    val userId: String,
    val lessonId: String,
    val status: String,
)

data class MyGlossary(
    val userId: String,
    val terms: List<GlossaryTermEntry>,
)

data class GlossaryTermEntry(
    val id: String,
    val lessonId: String,
    val courseId: String,
    val courseTitle: String,
    val term: String,
    val definition: String,
    val example: String? = null,
    val isBookmarked: Boolean = false,
)

data class LessonNoteEntry(
    val id: String,
    val lessonId: String,
    val courseId: String,
    val courseTitle: String,
    val lessonTitle: String,
    val content: String,
)

data class CourseHelpRequestCreate(
    val requestType: String,
    val message: String,
    val courseId: String? = null,
    val lessonId: String? = null,
    val screenKey: String? = null,
    val screenTitle: String? = null,
)
