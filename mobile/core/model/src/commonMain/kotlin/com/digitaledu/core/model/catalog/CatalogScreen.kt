package com.digitaledu.core.model.catalog

import com.digitaledu.core.model.content.ScreenPayload

data class CatalogScreen(
    val id: String,
    val screenKey: String,
    val title: String,
    val orderIndex: Int,
    val payload: ScreenPayload,
)
