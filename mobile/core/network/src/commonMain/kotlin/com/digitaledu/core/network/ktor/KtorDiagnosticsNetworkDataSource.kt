package com.digitaledu.core.network.ktor

import com.digitaledu.core.model.diagnostics.CompetencyScore
import com.digitaledu.core.model.diagnostics.DiagnosticAnswer
import com.digitaledu.core.model.diagnostics.DiagnosticAttempt
import com.digitaledu.core.model.diagnostics.DiagnosticOption
import com.digitaledu.core.model.diagnostics.DiagnosticQuestion
import com.digitaledu.core.model.diagnostics.DiagnosticQuestionBank
import com.digitaledu.core.model.diagnostics.DiagnosticResult
import com.digitaledu.core.model.diagnostics.LearningTrajectoryItem
import com.digitaledu.core.model.diagnostics.MyLearningTrajectory
import com.digitaledu.core.network.DiagnosticsNetworkDataSource
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.headers
import io.ktor.client.request.post
import io.ktor.client.request.get
import io.ktor.client.request.setBody
import io.ktor.client.request.url
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

class KtorDiagnosticsNetworkDataSource(
    private val client: HttpClient,
) : DiagnosticsNetworkDataSource {
    override suspend fun getActiveDiagnostic(accessToken: String): DiagnosticQuestionBank = executeCall {
        client.get {
            url("api/v1/diagnostics/active")
            headers { append(HttpHeaders.Authorization, "Bearer $accessToken") }
        }.body<DiagnosticBankResponse>().toDomain()
    }

    override suspend fun startAttempt(accessToken: String): DiagnosticAttempt = executeCall {
        client.post {
            url("api/v1/diagnostics/attempts")
            headers { append(HttpHeaders.Authorization, "Bearer $accessToken") }
        }.body<DiagnosticAttemptResponse>().toDomain()
    }

    override suspend fun submitAnswer(
        accessToken: String,
        attemptId: String,
        questionId: String,
        selectedOptionKey: String,
    ): DiagnosticAnswer = executeCall {
        client.post {
            url("api/v1/diagnostics/attempts/$attemptId/answers")
            headers { append(HttpHeaders.Authorization, "Bearer $accessToken") }
            contentType(ContentType.Application.Json)
            setBody(DiagnosticAnswerRequest(questionId, selectedOptionKey))
        }.body<DiagnosticAnswerResponse>().toDomain()
    }

    override suspend fun completeAttempt(accessToken: String, attemptId: String): DiagnosticResult = executeCall {
        client.post {
            url("api/v1/diagnostics/attempts/$attemptId/complete")
            headers { append(HttpHeaders.Authorization, "Bearer $accessToken") }
        }.body<DiagnosticResultResponse>().toDomain()
    }

    override suspend fun getLatestResult(accessToken: String): DiagnosticResult? = executeCall {
        client.get {
            url("api/v1/diagnostics/me/latest")
            headers { append(HttpHeaders.Authorization, "Bearer $accessToken") }
        }.body<DiagnosticResultResponse?>()?.toDomain()
    }

    override suspend fun getMyTrajectory(accessToken: String): MyLearningTrajectory = executeCall {
        client.get {
            url("api/v1/diagnostics/me/trajectory")
            headers { append(HttpHeaders.Authorization, "Bearer $accessToken") }
        }.body<MyLearningTrajectoryResponse>().toDomain()
    }
}

@Serializable
private data class DiagnosticAnswerRequest(
    @SerialName("question_id") val questionId: String,
    @SerialName("selected_option_key") val selectedOptionKey: String,
)

@Serializable
private data class DiagnosticOptionResponse(val key: String, val text: String) {
    fun toDomain() = DiagnosticOption(key = key, text = text)
}

@Serializable
private data class DiagnosticQuestionResponse(
    val id: String,
    @SerialName("competency_key") val competencyKey: String,
    @SerialName("competency_title") val competencyTitle: String,
    val prompt: String,
    val options: List<DiagnosticOptionResponse>,
    val weight: Int,
    @SerialName("order_index") val orderIndex: Int,
) {
    fun toDomain() = DiagnosticQuestion(
        id = id,
        competencyKey = competencyKey,
        competencyTitle = competencyTitle,
        prompt = prompt,
        options = options.map { it.toDomain() },
        weight = weight,
        orderIndex = orderIndex,
    )
}

@Serializable
private data class DiagnosticBankResponse(
    val id: String,
    val code: String,
    val title: String,
    val version: Int,
    val questions: List<DiagnosticQuestionResponse>,
) {
    fun toDomain() = DiagnosticQuestionBank(id, code, title, version, questions.map { it.toDomain() })
}

@Serializable
private data class DiagnosticAttemptResponse(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("bank_id") val bankId: String,
    val status: String,
    @SerialName("started_at") val startedAt: String,
    @SerialName("completed_at") val completedAt: String? = null,
    @SerialName("overall_score") val overallScore: Float? = null,
) {
    fun toDomain() = DiagnosticAttempt(id, userId, bankId, status, startedAt, completedAt, overallScore)
}

@Serializable
private data class DiagnosticAnswerResponse(
    val id: String,
    @SerialName("attempt_id") val attemptId: String,
    @SerialName("question_id") val questionId: String,
    @SerialName("selected_option_key") val selectedOptionKey: String,
    @SerialName("answered_at") val answeredAt: String,
) {
    fun toDomain() = DiagnosticAnswer(id, attemptId, questionId, selectedOptionKey, answeredAt)
}

@Serializable
private data class CompetencyScoreResponse(
    val id: String,
    @SerialName("competency_key") val competencyKey: String,
    @SerialName("competency_title") val competencyTitle: String,
    val score: Float,
    val threshold: Float,
    val status: String,
) {
    fun toDomain() = CompetencyScore(id, competencyKey, competencyTitle, score, threshold, status)
}

@Serializable
private data class DiagnosticResultResponse(
    val attempt: DiagnosticAttemptResponse,
    val scores: List<CompetencyScoreResponse>,
) {
    fun toDomain() = DiagnosticResult(attempt.toDomain(), scores.map { it.toDomain() })
}

@Serializable
private data class LearningTrajectoryItemResponse(
    val id: String,
    @SerialName("course_id") val courseId: String? = null,
    @SerialName("course_slug") val courseSlug: String? = null,
    @SerialName("course_title") val courseTitle: String? = null,
    @SerialName("competency_key") val competencyKey: String,
    val reason: String,
    val priority: Int,
    val status: String,
) {
    fun toDomain() = LearningTrajectoryItem(
        id = id,
        courseId = courseId,
        courseSlug = courseSlug,
        courseTitle = courseTitle,
        competencyKey = competencyKey,
        reason = reason,
        priority = priority,
        status = status,
    )
}

@Serializable
private data class MyLearningTrajectoryResponse(
    @SerialName("user_id") val userId: String,
    val items: List<LearningTrajectoryItemResponse>,
) {
    fun toDomain() = MyLearningTrajectory(userId, items.map { it.toDomain() })
}
