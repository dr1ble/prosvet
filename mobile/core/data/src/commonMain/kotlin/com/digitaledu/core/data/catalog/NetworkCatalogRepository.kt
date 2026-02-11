package com.digitaledu.core.data.catalog

import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.CatalogCourse
import com.digitaledu.core.model.LessonReference
import com.digitaledu.core.network.CatalogNetworkDataSource

class NetworkCatalogRepository(
    private val networkDataSource: CatalogNetworkDataSource,
) : CatalogRepository {
    override suspend fun listCourses(): List<CatalogCourse> {
        return networkDataSource.listCourses(
            includeDrafts = false,
            includeArchived = false,
        )
    }

    override suspend fun getLatestCourseBundle(courseSlug: String): CatalogBundle {
        return networkDataSource.getLatestCourseBundle(courseSlug = courseSlug)
    }

    override suspend fun getLessonReferences(lessonId: String): List<LessonReference> {
        return networkDataSource.getLessonReferencesByLesson(lessonId = lessonId)
    }

    override suspend fun getLessonReference(referenceId: String): LessonReference {
        return networkDataSource.getLessonReference(referenceId = referenceId)
    }
}
