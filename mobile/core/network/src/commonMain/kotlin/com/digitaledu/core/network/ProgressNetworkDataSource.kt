package com.digitaledu.core.network

import com.digitaledu.core.model.progress.MyProgress
import com.digitaledu.core.model.progress.LessonProgressEntry

interface ProgressNetworkDataSource {
    suspend fun getMyProgress(accessToken: String): MyProgress
    suspend fun upsertLessonProgress(accessToken: String, lessonId: String, status: String): LessonProgressEntry
}
