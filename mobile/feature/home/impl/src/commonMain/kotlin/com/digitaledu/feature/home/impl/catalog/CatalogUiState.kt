package com.digitaledu.feature.home.impl.catalog

import com.digitaledu.core.model.CatalogCourse

data class CatalogUiState(
    val isLoading: Boolean = false,
    val courses: List<CatalogCourse> = emptyList(),
    val errorMessage: String? = null,
)
