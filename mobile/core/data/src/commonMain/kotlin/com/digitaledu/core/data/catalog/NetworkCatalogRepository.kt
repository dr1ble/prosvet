package com.digitaledu.core.data.catalog

import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.catalog.CatalogCourse
import com.digitaledu.core.model.reference.LessonReference
import com.digitaledu.core.network.CatalogNetworkDataSource

class NetworkCatalogRepository(
    private val authRepository: AuthRepository,
    private val networkDataSource: CatalogNetworkDataSource,
) : CatalogRepository {
    override suspend fun listCourses(): List<CatalogCourse> {
        return authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.listCourses(
                accessToken = accessToken,
                includeDrafts = false,
                includeArchived = false,
            )
        }
    }

    override suspend fun getLatestCourseBundle(courseSlug: String): CatalogBundle {
        return authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.getLatestCourseBundle(
                courseSlug = courseSlug,
                accessToken = accessToken,
            )
        }
    }

    override suspend fun getLessonReferences(lessonId: String): List<LessonReference> {
        return authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.getLessonReferencesByLesson(
                lessonId = lessonId,
                accessToken = accessToken,
            )
        }
    }

    override suspend fun getLessonReference(referenceId: String): LessonReference {
        return authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.getLessonReference(
                referenceId = referenceId,
                accessToken = accessToken,
            )
        }
    }
}
