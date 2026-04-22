package com.digitaledu.core.data.progress

import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.model.progress.CourseProgressInfo
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

    override suspend fun upsertLessonProgress(lessonId: String, status: String): LessonProgressEntry {
        return authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.upsertLessonProgress(accessToken, lessonId, status)
        }
    }
}
