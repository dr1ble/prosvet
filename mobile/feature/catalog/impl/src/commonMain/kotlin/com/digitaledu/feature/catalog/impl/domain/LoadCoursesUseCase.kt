package com.digitaledu.feature.catalog.impl.domain

import com.digitaledu.core.data.catalog.CatalogRepository
import com.digitaledu.core.model.catalog.CatalogCourse

internal class LoadCoursesUseCase(
    private val catalogRepository: CatalogRepository,
) {
    suspend operator fun invoke(): List<CatalogCourse> {
        return catalogRepository.listCourses()
    }
}
