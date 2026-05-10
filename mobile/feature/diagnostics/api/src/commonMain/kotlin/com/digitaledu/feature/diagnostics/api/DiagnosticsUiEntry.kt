package com.digitaledu.feature.diagnostics.api

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

interface DiagnosticsUiEntry {
    @Composable
    fun Content(
        uiState: DiagnosticsUiState,
        onIntent: (DiagnosticsIntent) -> Unit,
        modifier: Modifier = Modifier,
    )
}
