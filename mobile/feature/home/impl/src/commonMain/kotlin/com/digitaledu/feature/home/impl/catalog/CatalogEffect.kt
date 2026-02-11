package com.digitaledu.feature.home.impl.catalog

import com.digitaledu.core.model.CatalogBundle

sealed interface CatalogEffect {
    data class CourseOpened(val bundle: CatalogBundle) : CatalogEffect
}
