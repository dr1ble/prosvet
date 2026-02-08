package com.digitaledu.core.model

data class CatalogCourse(
    val id: String,
    val slug: String,
    val title: String,
    val description: String?,
)

data class CatalogRelease(
    val id: String,
    val version: String,
    val changelog: String?,
    val screenCount: Int,
)

data class CatalogScreen(
    val id: String,
    val screenKey: String,
    val title: String,
    val orderIndex: Int,
    val payloadPreview: String,
)

data class CatalogBundle(
    val course: CatalogCourse,
    val release: CatalogRelease,
    val screens: List<CatalogScreen>,
)
