package com.digitaledu.core.data.progress

import com.digitaledu.core.model.progress.CourseProgressInfo
import com.digitaledu.core.model.progress.CourseHelpRequestCreate
import com.digitaledu.core.model.progress.GlossaryTermEntry
import com.digitaledu.core.model.progress.LessonNoteEntry
import com.digitaledu.core.model.progress.LessonProgressEntry

interface ProgressRepository {
    suspend fun getMyProgress(): List<CourseProgressInfo>
    suspend fun getMyGlossary(): List<GlossaryTermEntry>
    suspend fun getMyNotes(): List<LessonNoteEntry>
    suspend fun createNote(lessonId: String, content: String): LessonNoteEntry
    suspend fun createHelpRequest(request: CourseHelpRequestCreate)
    suspend fun deleteNote(noteId: String)
    suspend fun upsertLessonProgress(lessonId: String, status: String): LessonProgressEntry
    suspend fun setGlossaryTermBookmark(termId: String, isBookmarked: Boolean)
}
