package com.digitaledu.feature.diagnostics.api

import kotlin.test.Test
import kotlin.test.assertFalse

class DiagnosticsContractsTest {
    @Test
    fun defaultStateHasNoCompletedDiagnostic() {
        val state = DiagnosticsUiState()

        assertFalse(state.hasCompletedDiagnostic)
        assertFalse(state.canComplete)
    }
}
