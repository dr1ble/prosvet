package com.digitaledu.feature.diagnostics.impl.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import com.digitaledu.core.model.diagnostics.CompetencyScore
import com.digitaledu.core.model.diagnostics.LearningTrajectoryItem
import com.digitaledu.core.ui.CenteredLoadingIndicator
import com.digitaledu.core.ui.components.ErrorDialog
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.feature.diagnostics.api.DiagnosticsIntent
import com.digitaledu.feature.diagnostics.api.DiagnosticsUiState

@Composable
internal fun DiagnosticsContent(
    uiState: DiagnosticsUiState,
    onIntent: (DiagnosticsIntent) -> Unit,
    modifier: Modifier = Modifier,
) {
    ErrorDialog(message = uiState.errorMessage, onDismiss = { onIntent(DiagnosticsIntent.DismissError) })

    if (uiState.isLoading && uiState.activeBank == null) {
        CenteredLoadingIndicator(modifier = modifier)
        return
    }

    val currentQuestion = uiState.currentQuestion
    if (uiState.currentAttempt != null && currentQuestion != null) {
        LazyColumn(
            modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
            contentPadding = PaddingValues(UiSpacing.md),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
        ) {
            item {
                Text(
                    text = "Входная диагностика",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "Вопрос ${uiState.currentQuestionIndex + 1} из ${uiState.questionsCount}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            item {
                Card(shape = UiShapes.cardLg) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(UiSpacing.md),
                        verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
                    ) {
                        Text(
                            text = currentQuestion.prompt,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                        currentQuestion.options.forEach { option ->
                            val selected = uiState.selectedAnswers[currentQuestion.id] == option.key
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(UiShapes.cardMd)
                                    .background(
                                        if (selected) MaterialTheme.colorScheme.primaryContainer
                                        else MaterialTheme.colorScheme.surfaceContainerHighest,
                                    )
                                    .clickable {
                                        onIntent(
                                            DiagnosticsIntent.SelectAnswer(currentQuestion.id, option.key),
                                        )
                                    }
                                    .padding(UiSpacing.md),
                            ) {
                                Text(text = option.text, style = MaterialTheme.typography.bodyLarge)
                            }
                        }
                    }
                }
            }
            item {
                val isLast = uiState.currentQuestionIndex == uiState.questionsCount - 1
                Button(
                    onClick = {
                        if (isLast) onIntent(DiagnosticsIntent.CompleteAttempt)
                        else onIntent(DiagnosticsIntent.MoveNext)
                    },
                    enabled = uiState.selectedAnswers.containsKey(currentQuestion.id) && !uiState.isLoading,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (isLast) "Завершить диагностику" else "Следующий вопрос")
                }
            }
        }
        return
    }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(UiSpacing.md),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
    ) {
        item {
            DiagnosticIntroCard(
                hasResult = uiState.hasCompletedDiagnostic,
                onStart = { onIntent(DiagnosticsIntent.StartAttempt) },
            )
        }
        uiState.latestResult?.let { result ->
            item {
                Text(
                    text = "Профиль компетенций",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
            }
            items(result.scores) { score -> CompetencyScoreCard(score) }
        }
        if (uiState.trajectory.isNotEmpty()) {
            item {
                Text(
                    text = "Персональная траектория",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
            }
            items(uiState.trajectory) { item ->
                TrajectoryCard(item = item, onIntent = onIntent)
            }
        }
    }
}

@Composable
private fun DiagnosticIntroCard(hasResult: Boolean, onStart: () -> Unit) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(UiSpacing.md),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            Text(
                text = if (hasResult) "Обновить диагностику" else "Пройти входную диагностику",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "Ответьте на короткие вопросы, чтобы получить профиль компетенций и персональный маршрут обучения.",
                style = MaterialTheme.typography.bodyMedium,
            )
            Button(onClick = onStart) { Text(if (hasResult) "Пройти заново" else "Начать") }
        }
    }
}

@Composable
private fun CompetencyScoreCard(score: CompetencyScore) {
    Card(shape = UiShapes.cardLg) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(UiSpacing.md),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(UiSpacing.sm)) {
                Text(score.competencyTitle, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                FilterChip(selected = score.isDeficit, onClick = {}, label = { Text(score.status.toStatusText()) })
            }
            LinearProgressIndicator(progress = { score.score.coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth())
            Text("Оценка: ${(score.score * 100).toInt()}%")
        }
    }
}

@Composable
private fun TrajectoryCard(item: LearningTrajectoryItem, onIntent: (DiagnosticsIntent) -> Unit) {
    Card(shape = UiShapes.cardLg) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(UiSpacing.md),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            Text(
                text = item.courseTitle ?: "Рекомендация по навыку",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
            Text(item.reason, style = MaterialTheme.typography.bodyMedium)
            val slug = item.courseSlug
            if (slug != null) {
                OutlinedButton(onClick = { onIntent(DiagnosticsIntent.OpenRecommendedCourse(slug)) }) {
                    Text("Открыть курс")
                }
            }
        }
    }
}

private fun String.toStatusText(): String = when (this) {
    "strong" -> "Сильная сторона"
    "needs_practice" -> "Нужна практика"
    "deficit" -> "Дефицит"
    else -> this
}
