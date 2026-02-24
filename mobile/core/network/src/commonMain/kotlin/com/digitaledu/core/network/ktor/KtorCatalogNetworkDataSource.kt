package com.digitaledu.core.network.ktor

import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.CatalogCourse
import com.digitaledu.core.model.CatalogRelease
import com.digitaledu.core.model.CatalogScreen
import com.digitaledu.core.model.LessonReference
import com.digitaledu.core.model.ScreenPayload
import com.digitaledu.core.network.CatalogNetworkDataSource
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.url
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

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
            }.body<List<CourseResponse>>().map(CourseResponse::toCatalogCourse)
        }
    }

    override suspend fun getLatestCourseBundle(courseSlug: String): CatalogBundle {
        return executeCall {
            val response = client.get {
                url("api/v1/catalog/courses/$courseSlug/releases/latest")
            }.body<CourseBundleResponse>()
            
            CatalogBundle(
                course = response.course.toCatalogCourse(),
                release = response.release.toCatalogRelease(),
                screens = response.screens
                    .map(ScreenResponse::toCatalogScreen)
                    .sortedBy(CatalogScreen::orderIndex),
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

private fun CourseResponse.toCatalogCourse(): CatalogCourse {
    return CatalogCourse(
        id = id,
        slug = slug,
        title = title,
        description = description,
        coverImageUrl = pickCoverImageUrl(),
    )
}

private fun ReleaseResponse.toCatalogRelease(): CatalogRelease {
    return CatalogRelease(
        id = id,
        version = version,
        changelog = changelog,
        screenCount = screenCount,
    )
}

private fun ScreenResponse.toCatalogScreen(): CatalogScreen {
    return CatalogScreen(
        id = id,
        screenKey = screenKey,
        title = title,
        orderIndex = orderIndex,
        payload = payload,
    )
}

private fun CourseResponse.pickCoverImageUrl(): String? {
    return listOf(coverUrl, photoUrl, imageUrl).firstOrNull { !it.isNullOrBlank() }
}
