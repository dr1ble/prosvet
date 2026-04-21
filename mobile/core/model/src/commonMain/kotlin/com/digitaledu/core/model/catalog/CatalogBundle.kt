package com.digitaledu.core.model.catalog

data class CatalogBundle(
    val course: CatalogCourse,
    val release: CatalogRelease,
    val screens: List<CatalogScreen>,
)
