package com.digitaledu.core.data.progress

import com.digitaledu.core.model.progress.CourseProgressInfo
import com.digitaledu.core.model.progress.LessonProgressEntry

interface ProgressRepository {
    suspend fun getMyProgress(): List<CourseProgressInfo>
    suspend fun upsertLessonProgress(lessonId: String, status: String): LessonProgressEntry
}
