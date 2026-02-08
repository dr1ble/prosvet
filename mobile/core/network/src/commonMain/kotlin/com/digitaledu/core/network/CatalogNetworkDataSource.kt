package com.digitaledu.core.network

import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.CatalogCourse

interface CatalogNetworkDataSource {
    suspend fun listCourses(
        includeDrafts: Boolean = false,
        includeArchived: Boolean = false,
    ): List<CatalogCourse>

    suspend fun getLatestCourseBundle(courseSlug: String): CatalogBundle
}
