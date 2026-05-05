package com.digitaledu.core.network.ktor

import com.digitaledu.core.model.progress.CourseProgressInfo
import com.digitaledu.core.model.progress.CourseHelpRequestCreate
import com.digitaledu.core.model.progress.GlossaryTermEntry
import com.digitaledu.core.model.progress.LessonNoteEntry
import com.digitaledu.core.model.progress.LessonProgressEntry
import com.digitaledu.core.model.progress.MyGlossary
import com.digitaledu.core.model.progress.MyProgress
import com.digitaledu.core.network.ProgressNetworkDataSource
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.delete
import io.ktor.client.request.setBody
import io.ktor.client.request.headers
import io.ktor.client.request.parameter
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.url
import io.ktor.http.HttpHeaders
import io.ktor.http.ContentType
import io.ktor.http.contentType
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

    override suspend fun getMyGlossary(accessToken: String): MyGlossary {
        return executeCall {
            val response = client.get {
                url("api/v1/progress/glossary/self")
                headers { append(HttpHeaders.Authorization, "Bearer $accessToken") }
            }.body<MyGlossaryResponse>()
            response.toDomain()
        }
    }

    override suspend fun getMyNotes(accessToken: String): List<LessonNoteEntry> {
        return executeCall {
            client.get {
                url("api/v1/progress/notes/self")
                headers { append(HttpHeaders.Authorization, "Bearer $accessToken") }
            }.body<MyNotesResponse>().notes.map { it.toDomain() }
        }
    }

    override suspend fun createNote(
        accessToken: String,
        lessonId: String,
        content: String,
    ): LessonNoteEntry {
        return executeCall {
            client.post {
                url("api/v1/progress/notes/self")
                headers { append(HttpHeaders.Authorization, "Bearer $accessToken") }
                contentType(ContentType.Application.Json)
                setBody(NoteCreateRequest(lessonId = lessonId, content = content))
            }.body<LessonNoteResponse>().toDomain()
        }
    }

    override suspend fun deleteNote(accessToken: String, noteId: String) {
        executeCall {
            client.delete {
                url("api/v1/progress/notes/self/$noteId")
                headers { append(HttpHeaders.Authorization, "Bearer $accessToken") }
            }
        }
    }

    override suspend fun createHelpRequest(accessToken: String, request: CourseHelpRequestCreate) {
        executeCall {
            client.post {
                url("api/v1/support/help-requests")
                headers { append(HttpHeaders.Authorization, "Bearer $accessToken") }
                contentType(ContentType.Application.Json)
                setBody(request.toPayload())
            }
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

    override suspend fun setGlossaryTermBookmark(
        accessToken: String,
        termId: String,
        isBookmarked: Boolean,
    ) {
        executeCall {
            client.patch {
                url("api/v1/progress/glossary/self/$termId/bookmark")
                headers { append(HttpHeaders.Authorization, "Bearer $accessToken") }
                parameter("is_bookmarked", isBookmarked)
            }
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

@Serializable
internal data class MyGlossaryResponse(
    @SerialName("user_id") val userId: String,
    @SerialName("terms") val terms: List<GlossaryTermResponse>,
) {
    fun toDomain() = MyGlossary(
        userId = userId,
        terms = terms.map { it.toDomain() },
    )
}

@Serializable
internal data class GlossaryTermResponse(
    @SerialName("id") val id: String,
    @SerialName("lesson_id") val lessonId: String,
    @SerialName("course_id") val courseId: String,
    @SerialName("course_title") val courseTitle: String,
    @SerialName("term") val term: String,
    @SerialName("definition") val definition: String,
    @SerialName("example") val example: String? = null,
    @SerialName("is_bookmarked") val isBookmarked: Boolean = false,
) {
    fun toDomain() = GlossaryTermEntry(
        id = id,
        lessonId = lessonId,
        courseId = courseId,
        courseTitle = courseTitle,
        term = term,
        definition = definition,
        example = example,
        isBookmarked = isBookmarked,
    )
}

@Serializable
internal data class MyNotesResponse(
    @SerialName("user_id") val userId: String,
    @SerialName("notes") val notes: List<LessonNoteResponse>,
)

@Serializable
internal data class NoteCreateRequest(
    @SerialName("lesson_id") val lessonId: String,
    @SerialName("content") val content: String,
)

@Serializable
internal data class HelpRequestCreateRequest(
    @SerialName("request_type") val requestType: String,
    @SerialName("message") val message: String,
    @SerialName("course_id") val courseId: String? = null,
    @SerialName("lesson_id") val lessonId: String? = null,
    @SerialName("screen_key") val screenKey: String? = null,
    @SerialName("screen_title") val screenTitle: String? = null,
)

internal fun CourseHelpRequestCreate.toPayload() = HelpRequestCreateRequest(
    requestType = requestType,
    message = message,
    courseId = courseId,
    lessonId = lessonId,
    screenKey = screenKey,
    screenTitle = screenTitle,
)

@Serializable
internal data class LessonNoteResponse(
    @SerialName("id") val id: String,
    @SerialName("lesson_id") val lessonId: String,
    @SerialName("course_id") val courseId: String,
    @SerialName("course_title") val courseTitle: String,
    @SerialName("lesson_title") val lessonTitle: String,
    @SerialName("content") val content: String,
) {
    fun toDomain() = LessonNoteEntry(
        id = id,
        lessonId = lessonId,
        courseId = courseId,
        courseTitle = courseTitle,
        lessonTitle = lessonTitle,
        content = content,
    )
}
