package com.digitaledu.core.data.diagnostics

import com.digitaledu.core.model.diagnostics.DiagnosticAnswer
import com.digitaledu.core.model.diagnostics.DiagnosticAttempt
import com.digitaledu.core.model.diagnostics.DiagnosticQuestionBank
import com.digitaledu.core.model.diagnostics.DiagnosticResult
import com.digitaledu.core.model.diagnostics.MyLearningTrajectory

interface DiagnosticsRepository {
    suspend fun getActiveDiagnostic(): DiagnosticQuestionBank
    suspend fun startAttempt(): DiagnosticAttempt
    suspend fun submitAnswer(
        attemptId: String,
        questionId: String,
        selectedOptionKey: String,
    ): DiagnosticAnswer
    suspend fun completeAttempt(attemptId: String): DiagnosticResult
    suspend fun getLatestResult(): DiagnosticResult?
    suspend fun getMyTrajectory(): MyLearningTrajectory
}
