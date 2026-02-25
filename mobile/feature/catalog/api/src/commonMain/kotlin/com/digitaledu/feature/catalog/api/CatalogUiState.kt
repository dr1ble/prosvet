package com.digitaledu.feature.catalog.api

import com.digitaledu.core.model.catalog.CatalogCourse

data class CatalogUiState(
    val isLoading: Boolean = false,
    val courses: List<CatalogCourse> = emptyList(),
    val errorMessage: String? = null,
)
