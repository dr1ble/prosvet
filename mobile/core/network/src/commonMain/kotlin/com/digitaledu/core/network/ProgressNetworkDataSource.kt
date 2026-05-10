package com.digitaledu.core.network

import com.digitaledu.core.model.progress.CourseHelpRequestCreate
import com.digitaledu.core.model.progress.LessonSessionAnalyticsCreate
import com.digitaledu.core.model.progress.MyHelpRequests
import com.digitaledu.core.model.progress.LessonNoteEntry
import com.digitaledu.core.model.progress.LessonProgressEntry
import com.digitaledu.core.model.progress.MyGlossary
import com.digitaledu.core.model.progress.MyProgress

interface ProgressNetworkDataSource {
    suspend fun getMyProgress(accessToken: String): MyProgress
    suspend fun getMyGlossary(accessToken: String): MyGlossary
    suspend fun getMyNotes(accessToken: String): List<LessonNoteEntry>
    suspend fun createNote(accessToken: String, lessonId: String, content: String): LessonNoteEntry
    suspend fun createHelpRequest(accessToken: String, request: CourseHelpRequestCreate)
    suspend fun getMyHelpRequests(accessToken: String): MyHelpRequests
    suspend fun markHelpRepliesRead(accessToken: String)
    suspend fun deleteNote(accessToken: String, noteId: String)
    suspend fun upsertLessonProgress(accessToken: String, lessonId: String, status: String): LessonProgressEntry
    suspend fun setGlossaryTermBookmark(accessToken: String, termId: String, isBookmarked: Boolean)
    suspend fun trackLessonSession(accessToken: String, payload: LessonSessionAnalyticsCreate)
}
