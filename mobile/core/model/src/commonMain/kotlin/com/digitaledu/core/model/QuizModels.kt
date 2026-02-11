package com.digitaledu.core.model

import kotlinx.serialization.SerialName
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

    /**
     * Single choice question.
     */
    @Serializable
    @SerialName("single_choice")
    data class SingleChoice(
        override val id: String,
        override val text: String,
        override val explanation: String? = null,
        val options: List<QuizOption>,
        @SerialName("correct_option_id") val correctOptionId: String
    ) : QuizQuestion

    /**
     * Multiple choice question (checkboxes).
     */
    @Serializable
    @SerialName("multiple_choice")
    data class MultipleChoice(
        override val id: String,
        override val text: String,
        override val explanation: String? = null,
        val options: List<QuizOption>,
        @SerialName("correct_option_ids") val correctOptionIds: Set<String>
    ) : QuizQuestion

    /**
     * Matching question (connect pairs).
     */
    @Serializable
    @SerialName("matching")
    data class Matching(
        override val id: String,
        override val text: String,
        override val explanation: String? = null,
        val items: List<MatchingItem>
    ) : QuizQuestion
}

@Serializable
data class QuizOption(
    val id: String,
    val text: String
)

@Serializable
data class MatchingItem(
    val id: String,
    val left: String,
    val right: String
)
