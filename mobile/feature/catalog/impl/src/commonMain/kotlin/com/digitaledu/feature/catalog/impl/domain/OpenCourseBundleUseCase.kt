package com.digitaledu.feature.catalog.impl.domain

import com.digitaledu.core.data.catalog.CatalogRepository
import com.digitaledu.core.model.catalog.CatalogBundle

internal class OpenCourseBundleUseCase(
    private val catalogRepository: CatalogRepository,
) {
    suspend operator fun invoke(courseSlug: String): CatalogBundle {
        return catalogRepository.getLatestCourseBundle(courseSlug = courseSlug)
    }
}
