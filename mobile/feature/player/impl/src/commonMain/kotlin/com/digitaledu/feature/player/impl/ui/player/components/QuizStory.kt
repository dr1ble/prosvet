package com.digitaledu.feature.player.impl.ui.player.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.digitaledu.core.model.content.QuizPayload
import com.digitaledu.core.model.quiz.MatchingQuestion
import com.digitaledu.core.model.quiz.MultipleChoiceQuestion
import com.digitaledu.core.model.quiz.SingleChoiceQuestion
import com.digitaledu.feature.player.api.PlayerIntent
import digital_education_mobile.feature.player.`impl`.generated.resources.Res
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_back
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_continue
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_finish
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_matching_pending
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_multiple_pending
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_next
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_previous
import digital_education_mobile.feature.player.`impl`.generated.resources.quiz_progress
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
    
    // Track answers state (implementation pending)

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
                
                // Options (Placeholder logic for now)
                when (currentQuestion) {
                    is SingleChoiceQuestion -> {
                        currentQuestion.options.forEach { option ->
                            QuizOptionItem(
                                text = option.text,
                                isSelected = false,
                                onClick = { }
                            )
                            Spacer(modifier = Modifier.height(UiSpacing.xs))
                        }
                    }
                    is MultipleChoiceQuestion -> {
                        // Handle logic
                        Text(stringResource(Res.string.quiz_multiple_pending))
                    }
                    is MatchingQuestion -> {
                        // Handle logic
                        Text(stringResource(Res.string.quiz_matching_pending))
                    }
                }
                
                Spacer(modifier = Modifier.height(UiSpacing.xl))
                
                // Navigation Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    if (currentQuestionIndex > 0) {
                        Button(
                            onClick = { currentQuestionIndex-- },
                            modifier = Modifier
                                .accessibilityTouchTarget
                                .accessibilitySemantics(
                                    label = stringResource(Res.string.quiz_previous),
                                    role = Role.Button,
                                ),
                        ) {
                            Text(stringResource(Res.string.quiz_previous))
                        }
                    } else {
                        // First question: "Previous" means Previous Screen in Course
                         Button(
                            onClick = { onIntent(PlayerIntent.Previous) },
                            modifier = Modifier
                                .accessibilityTouchTarget
                                .accessibilitySemantics(
                                    label = stringResource(Res.string.quiz_back),
                                    role = Role.Button,
                                ),
                         ) {
                            Text(stringResource(Res.string.quiz_back))
                         }

                    }

                    if (currentQuestionIndex < payload.questions.lastIndex) {
                        Button(
                            onClick = { currentQuestionIndex++ },
                            modifier = Modifier
                                .accessibilityTouchTarget
                                .accessibilitySemantics(
                                    label = stringResource(Res.string.quiz_next),
                                    role = Role.Button,
                                ),
                        ) {
                            Text(stringResource(Res.string.quiz_next))
                        }
                    } else {
                        Button(
                            onClick = { onIntent(PlayerIntent.Next) },
                            modifier = Modifier
                                .accessibilityTouchTarget
                                .accessibilitySemantics(
                                    label = stringResource(Res.string.quiz_finish),
                                    role = Role.Button,
                                ),
                        ) {
                            Text(stringResource(Res.string.quiz_finish))
                        }
                    }
                }
            }
        } else {
             // Fallback for empty quiz
             Button(
                 onClick = { onIntent(PlayerIntent.Next) },
                 modifier = Modifier
                     .accessibilityTouchTarget
                     .accessibilitySemantics(
                         label = stringResource(Res.string.quiz_continue),
                         role = Role.Button,
                     ),
             ) {
                 Text(stringResource(Res.string.quiz_continue))
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
            .clickable(onClick = onClick)
            .clip(UiShapes.cardMd),
        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
        shape = UiShapes.cardMd,
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(UiSpacing.md),
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
