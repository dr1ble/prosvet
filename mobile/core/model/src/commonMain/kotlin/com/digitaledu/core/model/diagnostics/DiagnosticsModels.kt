package com.digitaledu.core.model.diagnostics

import kotlinx.serialization.Serializable

@Serializable
data class DiagnosticOption(
    val key: String,
    val text: String,
)

@Serializable
data class DiagnosticQuestion(
    val id: String,
    val competencyKey: String,
    val competencyTitle: String,
    val prompt: String,
    val options: List<DiagnosticOption>,
    val weight: Int,
    val orderIndex: Int,
)

@Serializable
data class DiagnosticQuestionBank(
    val id: String,
    val code: String,
    val title: String,
    val version: Int,
    val questions: List<DiagnosticQuestion>,
)

@Serializable
data class DiagnosticAttempt(
    val id: String,
    val userId: String,
    val bankId: String,
    val status: String,
    val startedAt: String,
    val completedAt: String? = null,
    val overallScore: Float? = null,
)

@Serializable
data class DiagnosticAnswer(
    val id: String,
    val attemptId: String,
    val questionId: String,
    val selectedOptionKey: String,
    val answeredAt: String,
)

@Serializable
data class CompetencyScore(
    val id: String,
    val competencyKey: String,
    val competencyTitle: String,
    val score: Float,
    val threshold: Float,
    val status: String,
) {
    val isDeficit: Boolean get() = status == "deficit"
}

@Serializable
data class DiagnosticResult(
    val attempt: DiagnosticAttempt,
    val scores: List<CompetencyScore>,
)

@Serializable
data class LearningTrajectoryItem(
    val id: String,
    val courseId: String? = null,
    val courseSlug: String? = null,
    val courseTitle: String? = null,
    val competencyKey: String,
    val reason: String,
    val priority: Int,
    val status: String,
)

@Serializable
data class MyLearningTrajectory(
    val userId: String,
    val items: List<LearningTrajectoryItem>,
)
