package com.digitaledu.feature.diagnostics.api

sealed interface DiagnosticsIntent {
    data object Refresh : DiagnosticsIntent
    data object StartAttempt : DiagnosticsIntent
    data class SelectAnswer(val questionId: String, val optionKey: String) : DiagnosticsIntent
    data object MoveNext : DiagnosticsIntent
    data object CompleteAttempt : DiagnosticsIntent
    data object DismissError : DiagnosticsIntent
    data class OpenRecommendedCourse(val courseSlug: String) : DiagnosticsIntent
}
