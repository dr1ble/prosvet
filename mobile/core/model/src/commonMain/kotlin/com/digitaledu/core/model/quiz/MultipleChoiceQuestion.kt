package com.digitaledu.core.model.quiz

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
@SerialName("multiple_choice")
data class MultipleChoiceQuestion(
    override val id: String,
    override val text: String,
    override val explanation: String? = null,
    val options: List<QuizOption>,
    @SerialName("correct_option_ids") val correctOptionIds: Set<String>,
) : QuizQuestion
