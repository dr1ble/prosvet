package com.digitaledu.core.model.quiz

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
@SerialName("matching")
data class MatchingQuestion(
    override val id: String,
    override val text: String,
    override val explanation: String? = null,
    val items: List<MatchingItem>,
) : QuizQuestion
