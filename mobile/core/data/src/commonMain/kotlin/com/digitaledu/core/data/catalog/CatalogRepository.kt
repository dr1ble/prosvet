package com.digitaledu.core.data.catalog

import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.CatalogCourse

interface CatalogRepository {
    suspend fun listCourses(): List<CatalogCourse>
    suspend fun getLatestCourseBundle(courseSlug: String): CatalogBundle
}
