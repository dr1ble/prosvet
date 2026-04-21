package com.digitaledu.core.model.quiz

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
@SerialName("single_choice")
data class SingleChoiceQuestion(
    override val id: String,
    override val text: String,
    override val explanation: String? = null,
    val options: List<QuizOption>,
    @SerialName("correct_option_id") val correctOptionId: String,
) : QuizQuestion
