package com.digitaledu.feature.diagnostics.impl.presentation

import com.digitaledu.core.common.BaseViewModel
import com.digitaledu.core.common.toUserMessage
import com.digitaledu.core.data.diagnostics.DiagnosticsRepository
import com.digitaledu.feature.diagnostics.api.DiagnosticsEffect
import com.digitaledu.feature.diagnostics.api.DiagnosticsFeatureHost
import com.digitaledu.feature.diagnostics.api.DiagnosticsIntent
import com.digitaledu.feature.diagnostics.api.DiagnosticsUiState

internal class DiagnosticsViewModel(
    private val diagnosticsRepository: DiagnosticsRepository,
) : BaseViewModel<DiagnosticsUiState, DiagnosticsIntent, DiagnosticsEffect>(DiagnosticsUiState()),
    DiagnosticsFeatureHost {

    init {
        processIntent(DiagnosticsIntent.Refresh)
    }

    override suspend fun handleIntent(intent: DiagnosticsIntent) {
        when (intent) {
            DiagnosticsIntent.Refresh -> refresh()
            DiagnosticsIntent.StartAttempt -> startAttempt()
            is DiagnosticsIntent.SelectAnswer -> selectAnswer(intent.questionId, intent.optionKey)
            DiagnosticsIntent.MoveNext -> moveNext()
            DiagnosticsIntent.CompleteAttempt -> completeAttempt()
            DiagnosticsIntent.DismissError -> updateState { copy(errorMessage = null) }
            is DiagnosticsIntent.OpenRecommendedCourse -> emitEffect(
                DiagnosticsEffect.CourseRequested(intent.courseSlug)
            )
        }
    }

    private suspend fun refresh() {
        runLoadingAction {
            val bank = diagnosticsRepository.getActiveDiagnostic()
            val latest = diagnosticsRepository.getLatestResult()
            val trajectory = diagnosticsRepository.getMyTrajectory().items
            updateState {
                copy(
                    isLoading = false,
                    activeBank = bank,
                    latestResult = latest,
                    trajectory = trajectory,
                    errorMessage = null,
                )
            }
        }
    }

    private suspend fun startAttempt() {
        runLoadingAction {
            val bank = currentState.activeBank ?: diagnosticsRepository.getActiveDiagnostic()
            val attempt = diagnosticsRepository.startAttempt()
            updateState {
                copy(
                    isLoading = false,
                    activeBank = bank,
                    currentAttempt = attempt,
                    selectedAnswers = emptyMap(),
                    currentQuestionIndex = 0,
                    errorMessage = null,
                )
            }
        }
    }

    private fun selectAnswer(questionId: String, optionKey: String) {
        updateState { copy(selectedAnswers = selectedAnswers + (questionId to optionKey)) }
    }

    private fun moveNext() {
        val nextIndex = (currentState.currentQuestionIndex + 1).coerceAtMost(
            (currentState.questionsCount - 1).coerceAtLeast(0),
        )
        updateState { copy(currentQuestionIndex = nextIndex) }
    }

    private suspend fun completeAttempt() {
        val attempt = currentState.currentAttempt ?: return
        val bank = currentState.activeBank ?: return
        if (!currentState.canComplete) return

        runLoadingAction {
            bank.questions.forEach { question ->
                diagnosticsRepository.submitAnswer(
                    attemptId = attempt.id,
                    questionId = question.id,
                    selectedOptionKey = currentState.selectedAnswers.getValue(question.id),
                )
            }
            val result = diagnosticsRepository.completeAttempt(attempt.id)
            val trajectory = diagnosticsRepository.getMyTrajectory().items
            updateState {
                copy(
                    isLoading = false,
                    currentAttempt = null,
                    latestResult = result,
                    trajectory = trajectory,
                    selectedAnswers = emptyMap(),
                    currentQuestionIndex = 0,
                    errorMessage = null,
                )
            }
            emitEffect(DiagnosticsEffect.DiagnosticCompleted)
        }
    }

    private suspend fun runLoadingAction(block: suspend () -> Unit) {
        updateState { copy(isLoading = true, errorMessage = null) }
        try {
            block()
        } catch (throwable: Throwable) {
            updateState { copy(isLoading = false, errorMessage = throwable.toUserMessage()) }
        }
    }
}
