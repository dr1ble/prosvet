package com.digitaledu.core.data.catalog

import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.CatalogCourse
import com.digitaledu.core.model.LessonReference

interface CatalogRepository {
    suspend fun listCourses(): List<CatalogCourse>
    suspend fun getLatestCourseBundle(courseSlug: String): CatalogBundle
    suspend fun getLessonReferences(lessonId: String): List<LessonReference>
    suspend fun getLessonReference(referenceId: String): LessonReference
}
