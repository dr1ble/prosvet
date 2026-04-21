package com.digitaledu.core.network.ktor

import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.CatalogCourse
import com.digitaledu.core.model.CatalogRelease
import com.digitaledu.core.model.CatalogScreen
import com.digitaledu.core.model.Hotspot
import com.digitaledu.core.model.LessonReference
import com.digitaledu.core.model.ScreenPayload
import com.digitaledu.core.network.CatalogNetworkDataSource
import com.digitaledu.core.network.NetworkException
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.plugins.RedirectResponseException
import io.ktor.client.plugins.ServerResponseException
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.url
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

class KtorCatalogNetworkDataSource(
    private val client: HttpClient,
) : CatalogNetworkDataSource {

    override suspend fun listCourses(
        includeDrafts: Boolean,
        includeArchived: Boolean,
    ): List<CatalogCourse> {
        return executeCall {
            client.get {
                url("api/v1/catalog/courses")
                parameter("include_drafts", includeDrafts)
                parameter("include_archived", includeArchived)
            }.body<List<CourseResponse>>().map { response ->
                CatalogCourse(
                    id = response.id,
                    slug = response.slug,
                    title = response.title,
                    description = response.description,
                    coverImageUrl = response.pickCoverImageUrl(),
                    category = response.category,
                    lessonCount = response.lessonCount,
                    durationMinutes = response.durationMinutes,
                )
            }
        }
    }

    override suspend fun getLatestCourseBundle(courseSlug: String): CatalogBundle {
        return executeCall {
            val response = client.get {
                url("api/v1/catalog/courses/$courseSlug/releases/latest")
            }.body<CourseBundleResponse>()
            
            CatalogBundle(
                course = CatalogCourse(
                    id = response.course.id,
                    slug = response.course.slug,
                    title = response.course.title,
                    description = response.course.description,
                    coverImageUrl = response.course.pickCoverImageUrl(),
                    category = response.course.category,
                    lessonCount = response.course.lessonCount,
                    durationMinutes = response.course.durationMinutes,
                ),
                release = CatalogRelease(
                    id = response.release.id,
                    version = response.release.version,
                    changelog = response.release.changelog,
                    screenCount = response.release.screenCount,
                ),
                screens = response.screens
                    .map { screen ->
                        CatalogScreen(
                            id = screen.id,
                            screenKey = screen.screenKey,
                            title = screen.title,
                            orderIndex = screen.orderIndex,
                            payload = screen.payload,
                        )
                    }
                    .sortedBy { it.orderIndex },
            )
        }
    }

    override suspend fun getLessonReference(referenceId: String): LessonReference {
        return executeCall {
            client.get {
                url("api/v1/catalog/references/$referenceId")
            }.body()
        }
    }

    override suspend fun getLessonReferencesByLesson(lessonId: String): List<LessonReference> {
        return executeCall {
            client.get {
                url("api/v1/catalog/courses/lessons/$lessonId/references")
            }.body()
        }
    }

    private suspend fun <T> executeCall(block: suspend () -> T): T {
        return try {
            block()
        } catch (e: ClientRequestException) {
            throw NetworkException(
                message = "Client error: ${e.response.status.value}",
                statusCode = e.response.status.value,
                cause = e
            )
        } catch (e: ServerResponseException) {
            throw NetworkException(
                message = "Server error: ${e.response.status.value}",
                statusCode = e.response.status.value,
                cause = e
            )
        } catch (e: RedirectResponseException) {
            throw NetworkException(
                message = "Redirect error: ${e.response.status.value}",
                statusCode = e.response.status.value,
                cause = e
            )
        } catch (e: Exception) {
            throw NetworkException(
                message = "Unknown network error",
                cause = e
            )
        }
    }

    companion object {
        private const val PAYLOAD_PREVIEW_LIMIT = 140
    }
}

@Serializable
private data class CourseResponse(
    val id: String,
    val slug: String,
    val title: String,
    val description: String? = null,
    @SerialName("cover_url") val coverUrl: String? = null,
    @SerialName("photo_url") val photoUrl: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    val category: String? = null,
    @SerialName("lesson_count") val lessonCount: Int? = null,
    @SerialName("duration_minutes") val durationMinutes: Int? = null,
)

@Serializable
private data class ReleaseResponse(
    val id: String,
    val version: String,
    val changelog: String? = null,
    @SerialName("screen_count") val screenCount: Int,
)

@Serializable
private data class ScreenResponse(
    val id: String,
    @SerialName("screen_key") val screenKey: String,
    val title: String,
    @SerialName("order_index") val orderIndex: Int,
    val payload: ScreenPayload,
)

@Serializable
private data class CourseBundleResponse(
    val course: CourseResponse,
    val release: ReleaseResponse,
    val screens: List<ScreenResponse>,
)

private fun CourseResponse.pickCoverImageUrl(): String? {
    return listOf(coverUrl, photoUrl, imageUrl).firstOrNull { !it.isNullOrBlank() }
}
