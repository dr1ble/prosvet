package com.digitaledu.core.model.content

import com.digitaledu.core.model.quiz.QuizQuestion

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
@SerialName("quiz")
data class QuizPayload(
    val questions: List<QuizQuestion>,
) : ScreenPayload
