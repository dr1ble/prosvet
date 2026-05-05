package com.digitaledu.core.model.catalog

data class CatalogCourse(
    val id: String,
    val slug: String,
    val title: String,
    val description: String?,
    val coverImageUrl: String? = null,
    val isFavorite: Boolean = false,
)
