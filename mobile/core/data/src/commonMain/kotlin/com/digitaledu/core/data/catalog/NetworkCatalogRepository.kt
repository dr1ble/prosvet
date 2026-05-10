package com.digitaledu.core.data.catalog

import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.catalog.CatalogCourse
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

    override suspend fun listFavoriteCourses(): List<CatalogCourse> {
        return authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.listFavoriteCourses(accessToken = accessToken)
        }
    }

    override suspend fun addFavoriteCourse(courseId: String): CatalogCourse {
        return authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.addFavoriteCourse(courseId = courseId, accessToken = accessToken)
        }
    }

    override suspend fun removeFavoriteCourse(courseId: String): CatalogCourse {
        return authRepository.withFreshAccessToken { accessToken ->
            networkDataSource.removeFavoriteCourse(courseId = courseId, accessToken = accessToken)
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
}
