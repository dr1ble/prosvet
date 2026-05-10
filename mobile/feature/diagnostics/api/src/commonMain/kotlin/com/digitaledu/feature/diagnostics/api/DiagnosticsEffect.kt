package com.digitaledu.feature.diagnostics.api

sealed interface DiagnosticsEffect {
    data class CourseRequested(val courseSlug: String) : DiagnosticsEffect
    data object DiagnosticCompleted : DiagnosticsEffect
}
