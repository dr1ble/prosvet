package com.digitaledu.core.network

import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.catalog.CatalogCourse

interface CatalogNetworkDataSource {
    suspend fun listCourses(
        accessToken: String,
        includeDrafts: Boolean = false,
        includeArchived: Boolean = false,
    ): List<CatalogCourse>

    suspend fun listFavoriteCourses(accessToken: String): List<CatalogCourse>

    suspend fun addFavoriteCourse(courseId: String, accessToken: String): CatalogCourse

    suspend fun removeFavoriteCourse(courseId: String, accessToken: String): CatalogCourse

    suspend fun getLatestCourseBundle(courseSlug: String, accessToken: String): CatalogBundle
}
