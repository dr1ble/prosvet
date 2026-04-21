package com.digitaledu.feature.catalog.impl.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.digitaledu.feature.catalog.api.CatalogIntent
import com.digitaledu.feature.catalog.api.CatalogUiEntry
import com.digitaledu.feature.catalog.api.CatalogUiState

internal class CatalogUiEntryImpl : CatalogUiEntry {
    @Composable
    override fun Content(
        uiState: CatalogUiState,
        onIntent: (CatalogIntent) -> Unit,
        modifier: Modifier,
    ) {
        CoursesContent(
            uiState = uiState,
            onIntent = onIntent,
            modifier = modifier,
        )
    }
}
