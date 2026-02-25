package com.digitaledu.core.network.ktor

import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.catalog.CatalogCourse
import com.digitaledu.core.model.catalog.CatalogRelease
import com.digitaledu.core.model.catalog.CatalogScreen
import com.digitaledu.core.model.reference.LessonReference
import com.digitaledu.core.network.CatalogNetworkDataSource
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.url

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
