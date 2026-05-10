package com.digitaledu.feature.diagnostics.api

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

interface DiagnosticsFeatureHost {
    val uiState: StateFlow<DiagnosticsUiState>
    val effects: Flow<DiagnosticsEffect>

    fun processIntent(intent: DiagnosticsIntent)
}
