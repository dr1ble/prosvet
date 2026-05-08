package com.digitaledu.feature.home.impl

import com.digitaledu.core.model.catalog.CatalogCourse
import com.digitaledu.feature.catalog.api.CatalogCategories
import com.digitaledu.feature.catalog.api.CatalogUiState

internal fun CatalogUiState.resolveContinueCourseForLearning(): CatalogCourse? {
    val startedCourseIds = progressByCourseId
        .filterValues { progress -> progress.completedLessons > 0 && progress.completedLessons < progress.totalLessons }
        .keys
    return courses.firstOrNull { it.id in startedCourseIds } ?: courses.firstOrNull()
}

internal fun filterLearningCourses(
    courses: List<CatalogCourse>,
    query: String,
    selectedCategoryId: String,
): List<CatalogCourse> {
    val normalizedQuery = query.trim()
    val category = CatalogCategories.byId(selectedCategoryId)
    return courses.filter { course ->
        val text = course.title + " " + (course.description ?: "")
        val matchesQuery = normalizedQuery.isEmpty() || text.contains(normalizedQuery, ignoreCase = true)
        val matchesCategory = category.id == CatalogCategories.ALL_ID ||
            category.keywords.any { keyword -> text.contains(keyword, ignoreCase = true) }
        matchesQuery && matchesCategory
    }
}
