package com.digitaledu.core.model.quiz

import kotlinx.serialization.Serializable

@Serializable
data class QuizOption(
    val id: String,
    val text: String,
)
