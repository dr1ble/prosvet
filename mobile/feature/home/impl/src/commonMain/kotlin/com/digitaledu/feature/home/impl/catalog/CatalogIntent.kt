package com.digitaledu.feature.home.impl.catalog

sealed interface CatalogIntent {
    data object RefreshCourses : CatalogIntent
    data class OpenCourse(val slug: String) : CatalogIntent
    data object DismissError : CatalogIntent
}
