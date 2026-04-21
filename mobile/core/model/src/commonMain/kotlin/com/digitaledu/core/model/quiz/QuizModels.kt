package com.digitaledu.core.model.quiz

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonClassDiscriminator

/**
 * Represents a single question in a quiz.
 */
@Serializable
@JsonClassDiscriminator("type")
sealed interface QuizQuestion {
    val id: String
    val text: String
    val explanation: String? // Shown after answering
}
