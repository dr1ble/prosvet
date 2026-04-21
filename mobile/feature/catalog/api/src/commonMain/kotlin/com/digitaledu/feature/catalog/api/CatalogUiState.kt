package com.digitaledu.feature.catalog.api

import com.digitaledu.core.model.catalog.CatalogCourse

data class CatalogUiState(
    val isLoading: Boolean = false,
    val courses: List<CatalogCourse> = emptyList(),
    val errorMessage: String? = null,
    val searchQuery: String = "",
    val selectedCategoryId: String = CatalogCategories.ALL_ID,
    val progressByCourseId: Map<String, CourseProgress> = emptyMap(),
) {
    val filteredCourses: List<CatalogCourse>
        get() {
            val category = CatalogCategories.byId(selectedCategoryId)
            val query = searchQuery.trim()
            return courses.filter { course ->
                matchesQuery(course, query) && matchesCategory(course, category)
            }
        }

    private fun matchesQuery(course: CatalogCourse, query: String): Boolean {
        if (query.isEmpty()) return true
        return course.title.contains(query, ignoreCase = true) ||
            (course.description?.contains(query, ignoreCase = true) == true)
    }

    private fun matchesCategory(course: CatalogCourse, category: CatalogCategory): Boolean {
        if (category.id == CatalogCategories.ALL_ID) return true
        course.category?.let { explicit ->
            return explicit.equals(category.id, ignoreCase = true) ||
                explicit.equals(category.label, ignoreCase = true)
        }
        val haystack = (course.title + " " + (course.description ?: "")).lowercase()
        return category.keywords.any { haystack.contains(it) }
    }
}

data class CourseProgress(
    val completedLessons: Int,
    val totalLessons: Int,
)

data class CatalogCategory(
    val id: String,
    val label: String,
    val keywords: List<String>,
)

object CatalogCategories {
    const val ALL_ID = "all"

    val all: List<CatalogCategory> = listOf(
        CatalogCategory(ALL_ID, "Все курсы", emptyList()),
        CatalogCategory("gosuslugi", "Госуслуги", listOf("госуслуг")),
        CatalogCategory("banks", "Банки", listOf("банк", "плат", "деньг", "карт")),
        CatalogCategory("messengers", "Мессенджеры", listOf("whatsapp", "telegram", "мессендж", "чат", "общен")),
        CatalogCategory("security", "Кибербезопасность", listOf("мошен", "безопас", "защит", "пароль")),
    )

    fun byId(id: String): CatalogCategory = all.firstOrNull { it.id == id } ?: all.first()

    fun detectLabel(course: CatalogCourse): String {
        course.category?.takeIf { it.isNotBlank() }?.let { explicit ->
            return all.firstOrNull {
                it.id.equals(explicit, ignoreCase = true) ||
                    it.label.equals(explicit, ignoreCase = true)
            }?.label ?: explicit
        }
        val haystack = (course.title + " " + (course.description ?: "")).lowercase()
        return all.drop(1)
            .firstOrNull { cat -> cat.keywords.any { haystack.contains(it) } }
            ?.label
            ?: "Курс"
    }
}
