package com.digitaledu.core.data.progress

import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.model.progress.CourseHelpRequestCreate
import com.digitaledu.core.model.progress.CourseProgressInfo
import com.digitaledu.core.model.progress.GlossaryTermEntry
import com.digitaledu.core.model.progress.LessonNoteEntry
import com.digitaledu.core.model.progress.LessonProgressEntry
import com.digitaledu.core.network.ProgressNetworkDataSource

class NetworkProgressRepository(
    private val authRepository: AuthRepository,
    private val networkDataSource: ProgressNetworkDataSource,
) : ProgressRepository {

    override suspend fun getMyProgress(): List<CourseProgressInfo> {
        return authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.getMyProgress(accessToken).courses
        }
    }

    override suspend fun getMyGlossary(): List<GlossaryTermEntry> {
        return authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.getMyGlossary(accessToken).terms
        }
    }

    override suspend fun getMyNotes(): List<LessonNoteEntry> {
        return authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.getMyNotes(accessToken)
        }
    }

    override suspend fun createNote(lessonId: String, content: String): LessonNoteEntry {
        return authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.createNote(accessToken, lessonId, content)
        }
    }

    override suspend fun createHelpRequest(request: CourseHelpRequestCreate) {
        authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.createHelpRequest(accessToken, request)
        }
    }

    override suspend fun deleteNote(noteId: String) {
        authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.deleteNote(accessToken, noteId)
        }
    }

    override suspend fun upsertLessonProgress(lessonId: String, status: String): LessonProgressEntry {
        return authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.upsertLessonProgress(accessToken, lessonId, status)
        }
    }

    override suspend fun setGlossaryTermBookmark(termId: String, isBookmarked: Boolean) {
        authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.setGlossaryTermBookmark(accessToken, termId, isBookmarked)
        }
    }
}
