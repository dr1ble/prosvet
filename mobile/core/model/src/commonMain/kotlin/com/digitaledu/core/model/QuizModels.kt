package com.digitaledu.core.model

/**
 * Represents a single question in a quiz.
 */
sealed interface QuizQuestion {
    val id: String
    val text: String
    val explanation: String? // Shown after answering

    /**
     * Single choice question.
     */
    data class SingleChoice(
        override val id: String,
        override val text: String,
        override val explanation: String?,
        val options: List<QuizOption>,
        val correctOptionId: String
    ) : QuizQuestion

    /**
     * Multiple choice question (checkboxes).
     */
    data class MultipleChoice(
        override val id: String,
        override val text: String,
        override val explanation: String?,
        val options: List<QuizOption>,
        val correctOptionIds: Set<String>
    ) : QuizQuestion

    /**
     * Matching question (connect pairs).
     */
    data class Matching(
        override val id: String,
        override val text: String,
        override val explanation: String?,
        val items: List<MatchingItem>
    ) : QuizQuestion
}

data class QuizOption(
    val id: String,
    val text: String
)

data class MatchingItem(
    val id: String,
    val left: String,
    val right: String
)
