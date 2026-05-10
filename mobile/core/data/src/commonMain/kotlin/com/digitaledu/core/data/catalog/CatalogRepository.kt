package com.digitaledu.core.data.catalog

import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.catalog.CatalogCourse

interface CatalogRepository {
    suspend fun listCourses(): List<CatalogCourse>
    suspend fun listFavoriteCourses(): List<CatalogCourse>
    suspend fun addFavoriteCourse(courseId: String): CatalogCourse
    suspend fun removeFavoriteCourse(courseId: String): CatalogCourse
    suspend fun getLatestCourseBundle(courseSlug: String): CatalogBundle
}
