package com.digitaledu.core.network

import com.digitaledu.core.model.diagnostics.DiagnosticAnswer
import com.digitaledu.core.model.diagnostics.DiagnosticAttempt
import com.digitaledu.core.model.diagnostics.DiagnosticQuestionBank
import com.digitaledu.core.model.diagnostics.DiagnosticResult
import com.digitaledu.core.model.diagnostics.MyLearningTrajectory

interface DiagnosticsNetworkDataSource {
    suspend fun getActiveDiagnostic(accessToken: String): DiagnosticQuestionBank
    suspend fun startAttempt(accessToken: String): DiagnosticAttempt
    suspend fun submitAnswer(
        accessToken: String,
        attemptId: String,
        questionId: String,
        selectedOptionKey: String,
    ): DiagnosticAnswer
    suspend fun completeAttempt(accessToken: String, attemptId: String): DiagnosticResult
    suspend fun getLatestResult(accessToken: String): DiagnosticResult?
    suspend fun getMyTrajectory(accessToken: String): MyLearningTrajectory
}
