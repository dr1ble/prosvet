package com.digitaledu.core.data.diagnostics

import com.digitaledu.core.data.auth.AuthRepository
import com.digitaledu.core.model.diagnostics.DiagnosticAnswer
import com.digitaledu.core.model.diagnostics.DiagnosticAttempt
import com.digitaledu.core.model.diagnostics.DiagnosticQuestionBank
import com.digitaledu.core.model.diagnostics.DiagnosticResult
import com.digitaledu.core.model.diagnostics.MyLearningTrajectory
import com.digitaledu.core.network.DiagnosticsNetworkDataSource

class NetworkDiagnosticsRepository(
    private val authRepository: AuthRepository,
    private val networkDataSource: DiagnosticsNetworkDataSource,
) : DiagnosticsRepository {
    override suspend fun getActiveDiagnostic(): DiagnosticQuestionBank =
        authRepository.withFreshAccessToken { networkDataSource.getActiveDiagnostic(it) }

    override suspend fun startAttempt(): DiagnosticAttempt =
        authRepository.withFreshAccessToken { networkDataSource.startAttempt(it) }

    override suspend fun submitAnswer(
        attemptId: String,
        questionId: String,
        selectedOptionKey: String,
    ): DiagnosticAnswer = authRepository.withFreshAccessToken {
        networkDataSource.submitAnswer(it, attemptId, questionId, selectedOptionKey)
    }

    override suspend fun completeAttempt(attemptId: String): DiagnosticResult =
        authRepository.withFreshAccessToken { networkDataSource.completeAttempt(it, attemptId) }

    override suspend fun getLatestResult(): DiagnosticResult? =
        authRepository.withFreshAccessToken { networkDataSource.getLatestResult(it) }

    override suspend fun getMyTrajectory(): MyLearningTrajectory =
        authRepository.withFreshAccessToken { networkDataSource.getMyTrajectory(it) }
}
