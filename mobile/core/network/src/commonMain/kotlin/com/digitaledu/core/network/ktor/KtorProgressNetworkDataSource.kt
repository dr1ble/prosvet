package com.digitaledu.core.network.ktor

import com.digitaledu.core.model.progress.CourseProgressInfo
import com.digitaledu.core.model.progress.LessonProgressEntry
import com.digitaledu.core.model.progress.MyProgress
import com.digitaledu.core.network.ProgressNetworkDataSource
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.headers
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.url
import io.ktor.http.HttpHeaders
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class KtorProgressNetworkDataSource(
    private val client: HttpClient,
) : ProgressNetworkDataSource {

    override suspend fun getMyProgress(accessToken: String): MyProgress {
        return executeCall {
            val response = client.get {
                url("api/v1/progress/me")
                headers { append(HttpHeaders.Authorization, "Bearer $accessToken") }
            }.body<MyProgressResponse>()
            response.toDomain()
        }
    }

    override suspend fun upsertLessonProgress(
        accessToken: String,
        lessonId: String,
        status: String,
    ): LessonProgressEntry {
        return executeCall {
            val response = client.post {
                url("api/v1/progress/lesson/self")
                headers { append(HttpHeaders.Authorization, "Bearer $accessToken") }
                parameter("lesson_id", lessonId)
                parameter("status", status)
            }.body<LessonProgressResponse>()
            response.toDomain()
        }
    }
}

@Serializable
internal data class MyProgressResponse(
    @SerialName("user_id") val userId: String,
    @SerialName("courses") val courses: List<CourseProgressResponse>,
) {
    fun toDomain() = MyProgress(
        userId = userId,
        courses = courses.map { it.toDomain() },
    )
}

@Serializable
internal data class CourseProgressResponse(
    @SerialName("course_id") val courseId: String,
    @SerialName("course_title") val courseTitle: String,
    @SerialName("total_lessons") val totalLessons: Int,
    @SerialName("completed_lessons") val completedLessons: Int,
    @SerialName("completion_rate") val completionRate: Float,
) {
    fun toDomain() = CourseProgressInfo(
        courseId = courseId,
        courseTitle = courseTitle,
        totalLessons = totalLessons,
        completedLessons = completedLessons,
        completionRate = completionRate,
    )
}

@Serializable
internal data class LessonProgressResponse(
    @SerialName("id") val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("lesson_id") val lessonId: String,
    @SerialName("status") val status: String,
) {
    fun toDomain() = LessonProgressEntry(
        id = id,
        userId = userId,
        lessonId = lessonId,
        status = status,
    )
}
