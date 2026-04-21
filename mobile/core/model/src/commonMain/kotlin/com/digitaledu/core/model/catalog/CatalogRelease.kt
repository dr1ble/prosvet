package com.digitaledu.core.model.catalog

data class CatalogRelease(
    val id: String,
    val version: String,
    val changelog: String?,
    val screenCount: Int,
)
