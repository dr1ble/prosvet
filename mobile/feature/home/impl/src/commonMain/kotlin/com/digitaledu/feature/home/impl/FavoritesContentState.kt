package com.digitaledu.feature.home.impl

import com.digitaledu.core.model.catalog.CatalogCourse

internal fun filterFavoriteCourses(courses: List<CatalogCourse>, query: String): List<CatalogCourse> {
    val normalizedQuery = query.trim()
    return courses.filter { course ->
        course.isFavorite && (
            normalizedQuery.isEmpty() ||
                course.title.contains(normalizedQuery, ignoreCase = true) ||
                course.description?.contains(normalizedQuery, ignoreCase = true) == true
        )
    }
}
