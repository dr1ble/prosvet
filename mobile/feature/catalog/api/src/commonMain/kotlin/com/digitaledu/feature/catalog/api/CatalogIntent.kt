package com.digitaledu.feature.catalog.api

sealed interface CatalogIntent {
    data object RefreshCourses : CatalogIntent
    data class OpenCourse(val slug: String) : CatalogIntent
    data object DismissError : CatalogIntent
    data class SetSearchQuery(val query: String) : CatalogIntent
    data class SetCategory(val categoryId: String) : CatalogIntent
    data class UpdateProgress(
        val courseId: String,
        val completedLessons: Int,
        val totalLessons: Int,
    ) : CatalogIntent
}
