package com.digitaledu.feature.home.impl.ui.player.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.digitaledu.core.model.ScreenPayload

/**
 * Renders a quiz unit with questions.
 * 
 * TODO: Implement generic question renderer (SingleChoice, MultipleChoice, Matching).
 */
@Composable
fun QuizView(
    payload: ScreenPayload.Quiz,
    onQuizCompleted: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Quiz: ${payload.questions.size} Questions",
            style = MaterialTheme.typography.headlineSmall
        )
        
        Text(
            text = "Quiz implementation coming soon...",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(vertical = 16.dp)
        )
        
        Button(onClick = onQuizCompleted) {
             Text("Simulate Completion")
        }
    }
}
