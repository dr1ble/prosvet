package com.digitaledu.feature.catalog.api

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

interface CatalogFeatureHost {
    val uiState: StateFlow<CatalogUiState>
    val effects: Flow<CatalogEffect>

    fun processIntent(intent: CatalogIntent)
}
