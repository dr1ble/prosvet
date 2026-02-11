package com.digitaledu.core.network

import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.CatalogCourse
import com.digitaledu.core.model.LessonReference

interface CatalogNetworkDataSource {
    suspend fun listCourses(
        includeDrafts: Boolean = false,
        includeArchived: Boolean = false,
    ): List<CatalogCourse>

    suspend fun getLatestCourseBundle(courseSlug: String): CatalogBundle

    suspend fun getLessonReference(referenceId: String): LessonReference
    
    suspend fun getLessonReferencesByLesson(lessonId: String): List<LessonReference>
}
