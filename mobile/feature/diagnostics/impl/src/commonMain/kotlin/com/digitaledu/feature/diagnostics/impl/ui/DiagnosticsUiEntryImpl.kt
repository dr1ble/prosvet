package com.digitaledu.feature.diagnostics.impl.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.digitaledu.feature.diagnostics.api.DiagnosticsIntent
import com.digitaledu.feature.diagnostics.api.DiagnosticsUiEntry
import com.digitaledu.feature.diagnostics.api.DiagnosticsUiState

internal class DiagnosticsUiEntryImpl : DiagnosticsUiEntry {
    @Composable
    override fun Content(
        uiState: DiagnosticsUiState,
        onIntent: (DiagnosticsIntent) -> Unit,
        modifier: Modifier,
    ) {
        DiagnosticsContent(uiState = uiState, onIntent = onIntent, modifier = modifier)
    }
}
