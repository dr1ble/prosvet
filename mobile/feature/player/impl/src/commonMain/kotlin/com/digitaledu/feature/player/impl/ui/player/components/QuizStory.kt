package com.digitaledu.feature.player.impl.ui.player.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.ui.components.AccessibilityScaledControlContainer
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.digitaledu.core.ui.components.accessibilityTremorFilteredClickable
import com.digitaledu.core.ui.components.rememberTremorFilteredOnClick
import com.digitaledu.core.model.content.QuizPayload
import com.digitaledu.core.model.quiz.MatchingQuestion
import com.digitaledu.core.model.quiz.MultipleChoiceQuestion
import com.digitaledu.core.model.quiz.SingleChoiceQuestion
import com.digitaledu.feature.player.api.PlayerIntent
import digital_education_mobile.feature.player.`impl`.generated.resources.Res
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_back
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_continue
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_correct_answer
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_finish
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_matching_left
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_matching_prompt
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_matching_right
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_matching_selected
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_multiple_pending
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_next
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_select_correct_answer
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_previous
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_progress
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_attempts
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_wrong_answer
import org.jetbrains.compose.resources.stringResource

/**
 * Quiz component for Stories flow.
 * 
 * Manages internal state for multiple questions within a single Lesson Screen.
 */
@Composable
fun QuizStory(
    payload: QuizPayload,
    onIntent: (PlayerIntent) -> Unit,
    modifier: Modifier = Modifier
) {
    var currentQuestionIndex by remember { mutableStateOf(0) }
    val currentQuestion = payload.questions.getOrNull(currentQuestionIndex)
    var answersState by remember(payload.questions) { mutableStateOf(QuizAnswersState()) }
    var selectedMatchingLeftId by remember(currentQuestion?.id) { mutableStateOf<String?>(null) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(UiSpacing.md)
    ) {
        if (currentQuestion != null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Question Counter
                Text(
                    text = stringResource(
                        Res.string.quiz_progress,
                        currentQuestionIndex + 1,
                        payload.questions.size,
                    ),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.secondary
                )
                
                Spacer(modifier = Modifier.height(UiSpacing.md))
                
                // Question Text
                Text(
                    text = currentQuestion.text,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                
                Spacer(modifier = Modifier.height(UiSpacing.xl))
                
                when (currentQuestion) {
                    is SingleChoiceQuestion -> {
                        val selectedIds = answersState.selectedOptionIds(currentQuestion.id)
                        currentQuestion.options.forEach { option ->
                            QuizOptionItem(
                                text = option.text,
                                isSelected = option.id in selectedIds,
                                onClick = {
                                    answersState = answersState.answerSingleChoice(
                                        question = currentQuestion,
                                        selectedOptionId = option.id,
                                    )
                                },
                            )
                            Spacer(modifier = Modifier.height(UiSpacing.xs))
                        }
                    }
                    is MultipleChoiceQuestion -> {
                        val selectedIds = answersState.selectedOptionIds(currentQuestion.id)
                        currentQuestion.options.forEach { option ->
                            QuizOptionItem(
                                text = option.text,
                                isSelected = option.id in selectedIds,
                                onClick = {
                                    val nextSelectedIds = if (option.id in selectedIds) {
                                        selectedIds - option.id
                                    } else {
                                        selectedIds + option.id
                                    }
                                    answersState = answersState.answerMultipleChoice(
                                        question = currentQuestion,
                                        selectedOptionIds = nextSelectedIds,
                                    )
                                },
                            )
                            Spacer(modifier = Modifier.height(UiSpacing.xs))
                        }
                    }
                    is MatchingQuestion -> {
                        Text(
                            text = stringResource(Res.string.quiz_matching_prompt),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(modifier = Modifier.height(UiSpacing.md))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(UiSpacing.md),
                        ) {
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                            ) {
                                Text(
                                    text = stringResource(Res.string.quiz_matching_left),
                                    style = MaterialTheme.typography.labelLarge,
                                    color = MaterialTheme.colorScheme.secondary,
                                )
                                currentQuestion.items.forEach { item ->
                                    val selectedRightId = answersState.selectedMatchingRightId(
                                        currentQuestion.id,
                                        item.id,
                                    )
                                    val selectedRight = currentQuestion.items.firstOrNull {
                                        it.id == selectedRightId
                                    }?.right
                                    QuizOptionItem(
                                        text = if (selectedRight == null) {
                                            item.left
                                        } else {
                                            "${item.left}\n${stringResource(Res.string.quiz_matching_selected, selectedRight)}"
                                        },
                                        isSelected = selectedMatchingLeftId == item.id,
                                        onClick = { selectedMatchingLeftId = item.id },
                                    )
                                }
                            }
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                            ) {
                                Text(
                                    text = stringResource(Res.string.quiz_matching_right),
                                    style = MaterialTheme.typography.labelLarge,
                                    color = MaterialTheme.colorScheme.secondary,
                                )
                                currentQuestion.items.forEach { item ->
                                    QuizOptionItem(
                                        text = item.right,
                                        isSelected = false,
                                        onClick = {
                                            val leftId = selectedMatchingLeftId ?: return@QuizOptionItem
                                            answersState = answersState.answerMatching(
                                                question = currentQuestion,
                                                leftItemId = leftId,
                                                rightItemId = item.id,
                                            )
                                            selectedMatchingLeftId = null
                                        },
                                    )
                                }
                            }
                        }
                    }
                }

                val canContinue = answersState.canContinue(currentQuestion)
                val attemptCount = answersState.attemptCount(currentQuestion.id)
                if (answersState.hasAnswered(currentQuestion.id)) {
                    Text(
                        text = if (canContinue) {
                            stringResource(Res.string.quiz_correct_answer)
                        } else {
                            stringResource(Res.string.quiz_wrong_answer)
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (canContinue) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.error
                        },
                    )
                    Text(
                        text = stringResource(Res.string.quiz_attempts, attemptCount),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else if (currentQuestion is SingleChoiceQuestion ||
                    currentQuestion is MultipleChoiceQuestion ||
                    currentQuestion is MatchingQuestion
                ) {
                    Text(
                        text = stringResource(Res.string.quiz_select_correct_answer),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                
                Spacer(modifier = Modifier.height(UiSpacing.xl))
                
                // Navigation Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    if (currentQuestionIndex > 0) {
                        Button(
                            onClick = rememberTremorFilteredOnClick { currentQuestionIndex-- },
                            modifier = Modifier
                                .accessibilityTouchTarget
                                .accessibilitySemantics(
                                    label = stringResource(Res.string.quiz_previous),
                                    role = Role.Button,
                                ),
                        ) {
                            AccessibilityScaledControlContainer {
                                Text(stringResource(Res.string.quiz_previous))
                            }
                        }
                    } else {
                        // First question: "Previous" means Previous Screen in Course
                          Button(
                             onClick = rememberTremorFilteredOnClick { onIntent(PlayerIntent.Previous) },
                            modifier = Modifier
                                .accessibilityTouchTarget
                                .accessibilitySemantics(
                                    label = stringResource(Res.string.quiz_back),
                                    role = Role.Button,
                                ),
                         ) {
                             AccessibilityScaledControlContainer {
                                 Text(stringResource(Res.string.quiz_back))
                             }
                          }

                    }

                    if (currentQuestionIndex < payload.questions.lastIndex) {
                        val canContinue = answersState.canContinue(currentQuestion)
                        Button(
                            onClick = rememberTremorFilteredOnClick(enabled = canContinue) { currentQuestionIndex++ },
                            enabled = canContinue,
                            modifier = Modifier
                                .accessibilityTouchTarget
                                .accessibilitySemantics(
                                    label = stringResource(Res.string.quiz_next),
                                    role = Role.Button,
                                ),
                        ) {
                            AccessibilityScaledControlContainer {
                                Text(stringResource(Res.string.quiz_next))
                            }
                        }
                    } else {
                        val canFinish = answersState.canContinue(currentQuestion)
                        Button(
                            onClick = rememberTremorFilteredOnClick(enabled = canFinish) { onIntent(PlayerIntent.FinishLesson) },
                            enabled = canFinish,
                            modifier = Modifier
                                .accessibilityTouchTarget
                                .accessibilitySemantics(
                                    label = stringResource(Res.string.quiz_finish),
                                    role = Role.Button,
                                ),
                        ) {
                            AccessibilityScaledControlContainer {
                                Text(stringResource(Res.string.quiz_finish))
                            }
                        }
                    }
                }
            }
        } else {
             // Fallback for empty quiz
              Button(
                  onClick = rememberTremorFilteredOnClick { onIntent(PlayerIntent.Next) },
                 modifier = Modifier
                     .accessibilityTouchTarget
                     .accessibilitySemantics(
                         label = stringResource(Res.string.quiz_continue),
                         role = Role.Button,
                     ),
              ) {
                  AccessibilityScaledControlContainer {
                      Text(stringResource(Res.string.quiz_continue))
                  }
              }
        }
    }
}

@Composable
fun QuizOptionItem(
    text: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .accessibilityTouchTarget
            .accessibilitySemantics(label = text, role = Role.Button)
            .accessibilityTremorFilteredClickable(onClick = onClick)
            .clip(UiShapes.cardMd),
        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
        shape = UiShapes.cardMd,
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(UiSpacing.md),
            color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
