package com.digitaledu.feature.diagnostics.api

import com.digitaledu.core.model.diagnostics.DiagnosticAttempt
import com.digitaledu.core.model.diagnostics.DiagnosticQuestionBank
import com.digitaledu.core.model.diagnostics.DiagnosticResult
import com.digitaledu.core.model.diagnostics.LearningTrajectoryItem

data class DiagnosticsUiState(
    val isLoading: Boolean = false,
    val activeBank: DiagnosticQuestionBank? = null,
    val currentAttempt: DiagnosticAttempt? = null,
    val latestResult: DiagnosticResult? = null,
    val trajectory: List<LearningTrajectoryItem> = emptyList(),
    val selectedAnswers: Map<String, String> = emptyMap(),
    val currentQuestionIndex: Int = 0,
    val errorMessage: String? = null,
) {
    val hasCompletedDiagnostic: Boolean get() = latestResult != null
    val questionsCount: Int get() = activeBank?.questions?.size ?: 0
    val currentQuestion get() = activeBank?.questions?.getOrNull(currentQuestionIndex)
    val canComplete: Boolean get() = questionsCount > 0 && selectedAnswers.size == questionsCount
}
