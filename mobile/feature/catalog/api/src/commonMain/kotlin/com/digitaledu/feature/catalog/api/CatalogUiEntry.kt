package com.digitaledu.feature.catalog.api

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

interface CatalogUiEntry {
    @Composable
    fun Content(
        uiState: CatalogUiState,
        onIntent: (CatalogIntent) -> Unit,
        modifier: Modifier = Modifier,
    )
}
