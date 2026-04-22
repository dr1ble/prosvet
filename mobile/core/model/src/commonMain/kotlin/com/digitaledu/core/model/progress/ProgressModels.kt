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
