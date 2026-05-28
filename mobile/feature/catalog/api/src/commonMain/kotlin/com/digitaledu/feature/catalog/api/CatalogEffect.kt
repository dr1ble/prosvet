package com.digitaledu.feature.catalog.api

import com.digitaledu.core.model.catalog.CatalogBundle

sealed interface CatalogEffect {
    data class CourseOpened(val bundle: CatalogBundle) : CatalogEffect
    data class CourseOpenedInLearning(val bundle: CatalogBundle) : CatalogEffect
    data class CourseContentsOpened(val bundle: CatalogBundle) : CatalogEffect
    data object FavoriteChanged : CatalogEffect
}
