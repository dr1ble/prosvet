package com.digitaledu.feature.home.impl.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.digitaledu.core.model.content.ArticlePayload
import com.digitaledu.core.model.content.CheatSheetPayload
import com.digitaledu.core.model.content.QuizPayload
import com.digitaledu.core.model.content.ScreenPayload
import com.digitaledu.core.model.content.SimulationPayload
import com.digitaledu.core.model.content.UnknownPayload
import com.digitaledu.core.model.content.VideoPayload
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.api.PlayerUiState

/**
 * Displays the current learning progress and allows continuing the lesson in fullscreen.
 * 
 * Simplified UX:
 * - Single card with course info + current screen preview
 * - Primary action: "Продолжить обучение" (launches fullscreen player)
 * - Secondary action: "Выбрать другой курс" (returns to catalog)
 */
@Composable
fun LessonContent(
    uiState: PlayerUiState,
    onIntent: (PlayerIntent) -> Unit,
    modifier: Modifier = Modifier,
) {
    val bundle = uiState.bundle

    if (bundle == null) {
        Column(
            modifier = modifier
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Выберите курс",
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                text = "Откройте курс в каталоге, и урок появится здесь.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Button(onClick = { onIntent(PlayerIntent.Close) }) {
                Text(text = "Вернуться к курсам")
            }
        }
        return
    }

    val currentScreen = uiState.currentScreen
    val totalScreens = bundle.screens.size.coerceAtLeast(1)
    val progress = (uiState.currentScreenIndex + 1).toFloat() / totalScreens.toFloat()

    Column(
        modifier = modifier
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Single unified card with all information
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant,
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Course title
                Text(
                    text = bundle.course.title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                
                // Progress bar
                Column(
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(100)),
                    )
                    Text(
                        text = "Экран ${uiState.currentScreenIndex + 1} из ${bundle.screens.size}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                
                Spacer(modifier = Modifier.height(4.dp))
                
                // Current screen preview
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = currentScreen?.title ?: "Содержимое временно недоступно",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        text = currentScreen?.payload?.getPayloadPreview() ?: "Открой другой курс или обнови релиз.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 3,
                    )
                }
            }
        }

        // Primary action: Continue learning
        Button(
            onClick = { onIntent(PlayerIntent.EnterFullscreen) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
        ) {
            Text(
                text = "Продолжить обучение",
                modifier = Modifier.padding(vertical = 4.dp),
            )
        }

        // Secondary action: Choose another course
        OutlinedButton(
            onClick = { onIntent(PlayerIntent.Close) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
        ) {
            Text(
                text = "Выбрать другой курс",
                modifier = Modifier.padding(vertical = 4.dp),
            )
        }
    }
}

private fun ScreenPayload.getPayloadPreview(): String {
    return when (this) {
        is SimulationPayload -> {
            buildString {
                append("Интерактивная симуляция")
                if (hotspots.isNotEmpty()) {
                    append(" • ${hotspots.size} ")
                    append(when (hotspots.size) {
                        1 -> "активная зона"
                        in 2..4 -> "активные зоны"
                        else -> "активных зон"
                    })
                }
                if (isStart) append(" • Начальный экран")
                if (isCompletion) append(" • Завершение")
            }
        }
        is VideoPayload -> {
            val minutes = durationSec / 60
            val seconds = durationSec % 60
            "Видеоурок • ${minutes}:${seconds.toString().padStart(2, '0')}"
        }
        is ArticlePayload -> {
            "Статья • ${markdownContent.length}" // Simplified preview
        }
        is QuizPayload -> {
            "Тест • ${questions.size} " + when (questions.size) {
                1 -> "вопрос"
                in 2..4 -> "вопроса"
                else -> "вопросов"
            }
        }
        is CheatSheetPayload -> {
            "Шпаргалка • Итоги урока"
        }
        is UnknownPayload -> {
            if (raw.length <= 100) raw else "${raw.take(100)}..."
        }
    }
}
