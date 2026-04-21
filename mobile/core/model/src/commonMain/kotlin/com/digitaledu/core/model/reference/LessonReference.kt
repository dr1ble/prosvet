package com.digitaledu.core.model.reference

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * A "Cheat Sheet" or summary reference for a completed lesson.
 * Saved to the user's profile for quick access.
 */
@Serializable
data class LessonReference(
    val id: String,
    @SerialName("lesson_id") val lessonId: String,
    val title: String,
    @SerialName("summary_text") val summaryText: String,
    @SerialName("key_points") val keyPoints: List<String>,
    @SerialName("code_snippets") val codeSnippets: List<CodeSnippet>
)
