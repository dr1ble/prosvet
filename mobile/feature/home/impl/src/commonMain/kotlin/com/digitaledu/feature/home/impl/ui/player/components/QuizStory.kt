package com.digitaledu.feature.home.impl.ui.player.components

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
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.digitaledu.core.model.content.QuizPayload
import com.digitaledu.core.model.quiz.MatchingQuestion
import com.digitaledu.core.model.quiz.MultipleChoiceQuestion
import com.digitaledu.core.model.quiz.SingleChoiceQuestion
import com.digitaledu.feature.player.api.PlayerIntent

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
            .padding(16.dp)
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
                    text = "Question ${currentQuestionIndex + 1} of ${payload.questions.size}",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.secondary
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Question Text
                Text(
                    text = currentQuestion.text,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                
                Spacer(modifier = Modifier.height(32.dp))
                
                // Options (Placeholder logic for now)
                when (currentQuestion) {
                    is SingleChoiceQuestion -> {
                        currentQuestion.options.forEach { option ->
                            QuizOptionItem(
                                text = option.text,
                                isSelected = false,
                                onClick = { }
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                    }
                    is MultipleChoiceQuestion -> {
                        // Handle logic
                         Text("Multiple Choice implementation pending")
                    }
                    is MatchingQuestion -> {
                        // Handle logic
                         Text("Matching implementation pending")
                    }
                }
                
                Spacer(modifier = Modifier.height(32.dp))
                
                // Navigation Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    if (currentQuestionIndex > 0) {
                        Button(onClick = { currentQuestionIndex-- }) {
                            Text("Previous")
                        }
                    } else {
                        // First question: "Previous" means Previous Screen in Course
                         Button(onClick = { onIntent(PlayerIntent.Previous) }) {
                            Text("Back")
                        }
                    }

                    if (currentQuestionIndex < payload.questions.lastIndex) {
                        Button(onClick = { currentQuestionIndex++ }) {
                            Text("Next")
                        }
                    } else {
                        Button(onClick = { onIntent(PlayerIntent.Next) }) {
                            Text("Finish")
                        }
                    }
                }
            }
        } else {
             // Fallback for empty quiz
             Button(onClick = { onIntent(PlayerIntent.Next) }) {
                 Text("Continue")
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
            .clickable(onClick = onClick)
            .clip(RoundedCornerShape(12.dp)),
        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
        shape = RoundedCornerShape(12.dp)
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(16.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
