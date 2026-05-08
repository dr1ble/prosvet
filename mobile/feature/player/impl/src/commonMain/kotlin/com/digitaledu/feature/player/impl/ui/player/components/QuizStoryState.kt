package com.digitaledu.feature.player.impl.ui.player.components

import com.digitaledu.core.model.quiz.MatchingQuestion
import com.digitaledu.core.model.quiz.MultipleChoiceQuestion
import com.digitaledu.core.model.quiz.QuizQuestion
import com.digitaledu.core.model.quiz.SingleChoiceQuestion

internal data class QuizAnswersState(
    private val selectedOptionIdsByQuestion: Map<String, Set<String>> = emptyMap(),
    private val matchingRightIdsByQuestion: Map<String, Map<String, String>> = emptyMap(),
    private val attemptCountByQuestion: Map<String, Int> = emptyMap(),
) {
    fun answerSingleChoice(
        question: SingleChoiceQuestion,
        selectedOptionId: String,
    ): QuizAnswersState = copyWithAnswer(
        questionId = question.id,
        selectedOptionIds = setOf(selectedOptionId),
    )

    fun answerMultipleChoice(
        question: MultipleChoiceQuestion,
        selectedOptionIds: Set<String>,
    ): QuizAnswersState = copyWithAnswer(
        questionId = question.id,
        selectedOptionIds = selectedOptionIds,
    )

    fun selectedOptionIds(questionId: String): Set<String> {
        return selectedOptionIdsByQuestion[questionId].orEmpty()
    }

    fun answerMatching(
        question: MatchingQuestion,
        leftItemId: String,
        rightItemId: String,
    ): QuizAnswersState {
        val validItemIds = question.items.map { it.id }.toSet()
        if (leftItemId !in validItemIds || rightItemId !in validItemIds) {
            return this
        }
        val currentPairs = matchingRightIdsByQuestion[question.id].orEmpty()
        return copy(
            matchingRightIdsByQuestion = matchingRightIdsByQuestion + (
                question.id to (currentPairs + (leftItemId to rightItemId))
            ),
            attemptCountByQuestion = attemptCountByQuestion + (
                question.id to (attemptCount(question.id) + 1)
            ),
        )
    }

    fun selectedMatchingRightId(questionId: String, leftItemId: String): String? {
        return matchingRightIdsByQuestion[questionId]?.get(leftItemId)
    }

    fun attemptCount(questionId: String): Int {
        return attemptCountByQuestion[questionId] ?: 0
    }

    fun canContinue(question: QuizQuestion): Boolean {
        return when (question) {
            is SingleChoiceQuestion -> selectedOptionIds(question.id) == setOf(question.correctOptionId)
            is MultipleChoiceQuestion -> selectedOptionIds(question.id) == question.correctOptionIds
            is MatchingQuestion -> question.items.isNotEmpty() && question.items.all { item ->
                selectedMatchingRightId(question.id, item.id) == item.id
            }
        }
    }

    fun hasAnswered(questionId: String): Boolean {
        return attemptCount(questionId) > 0
    }

    private fun copyWithAnswer(questionId: String, selectedOptionIds: Set<String>): QuizAnswersState {
        return copy(
            selectedOptionIdsByQuestion = selectedOptionIdsByQuestion + (questionId to selectedOptionIds),
            attemptCountByQuestion = attemptCountByQuestion + (
                questionId to (attemptCount(questionId) + 1)
            ),
        )
    }
}
