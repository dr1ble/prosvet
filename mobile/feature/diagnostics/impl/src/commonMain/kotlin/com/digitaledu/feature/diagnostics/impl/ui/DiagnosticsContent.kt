package com.digitaledu.feature.diagnostics.impl.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.digitaledu.core.model.diagnostics.CompetencyScore
import com.digitaledu.core.model.diagnostics.LearningTrajectoryItem
import com.digitaledu.core.ui.CenteredLoadingIndicator
import com.digitaledu.core.ui.components.ErrorDialog
import com.digitaledu.core.ui.components.UiOpacity
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.ui.components.accessibilityTremorFilteredClickable
import com.digitaledu.core.ui.components.rememberTremorFilteredOnClick
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

    LaunchedEffect(uiState.activeBank, uiState.currentAttempt, uiState.hasCompletedDiagnostic) {
        if (uiState.activeBank != null && uiState.currentAttempt == null && !uiState.hasCompletedDiagnostic) {
            onIntent(DiagnosticsIntent.StartAttempt)
        }
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
                Card(
                    shape = UiShapes.cardLg,
                    colors = androidx.compose.material3.CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
                    ),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(UiSpacing.md),
                        verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
                    ) {
                        Text(
                            text = currentQuestion.prompt,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        currentQuestion.options.forEach { option ->
                            val selected = uiState.selectedAnswers[currentQuestion.id] == option.key
                            val optionContainerColor = if (selected) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.surface
                            }
                            val optionTextColor = if (selected) {
                                MaterialTheme.colorScheme.onPrimary
                            } else {
                                MaterialTheme.colorScheme.onSurface
                            }
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(UiShapes.cardMd)
                                    .background(optionContainerColor)
                                    .border(
                                        width = 1.dp,
                                        color = if (selected) {
                                            MaterialTheme.colorScheme.primary
                                        } else {
                                            MaterialTheme.colorScheme.outlineVariant.copy(alpha = UiOpacity.scrimOverlay)
                                        },
                                        shape = UiShapes.cardMd,
                                    )
                                    .accessibilityTremorFilteredClickable {
                                        onIntent(
                                            DiagnosticsIntent.SelectAnswer(currentQuestion.id, option.key),
                                        )
                                    }
                                    .padding(UiSpacing.md),
                            ) {
                                Text(
                                    text = option.text,
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = optionTextColor,
                                )
                            }
                        }
                    }
                }
            }
            item {
                val isLast = uiState.currentQuestionIndex == uiState.questionsCount - 1
                val canMoveNext = uiState.selectedAnswers.containsKey(currentQuestion.id) && !uiState.isLoading
                Button(
                    onClick = rememberTremorFilteredOnClick(enabled = canMoveNext) {
                        if (isLast) onIntent(DiagnosticsIntent.CompleteAttempt)
                        else onIntent(DiagnosticsIntent.MoveNext)
                    },
                    enabled = canMoveNext,
                    shape = UiShapes.cardMd,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = if (isLast) "Завершить диагностику" else "Следующий вопрос",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = UiSpacing.xxs),
                    )
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
private fun CompetencyScoreCard(score: CompetencyScore) {
    val scoreValue = score.score.coerceIn(0f, 1f)
    val percent = (scoreValue * 100).toInt().coerceIn(0, 100)
    val isDeficit = score.isDeficit
    val accentColor = if (isDeficit) {
        MaterialTheme.colorScheme.tertiary
    } else {
        MaterialTheme.colorScheme.primary
    }
    val chipContainerColor = if (isDeficit) {
        MaterialTheme.colorScheme.tertiaryContainer
    } else {
        MaterialTheme.colorScheme.primaryContainer
    }
    val chipTextColor = if (isDeficit) {
        MaterialTheme.colorScheme.onTertiaryContainer
    } else {
        MaterialTheme.colorScheme.onPrimaryContainer
    }

    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = UiOpacity.scrimOverlay), UiShapes.cardLg),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.md),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = score.competencyTitle,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = "Оценка: $percent%",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Box(
                    modifier = Modifier
                        .clip(UiShapes.pill)
                        .background(chipContainerColor)
                        .padding(horizontal = UiSpacing.sm, vertical = UiSpacing.xs),
                ) {
                    Text(
                        text = score.status.toStatusText(),
                        style = MaterialTheme.typography.labelLarge,
                        color = chipTextColor,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(UiShapes.pill)
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(scoreValue)
                        .height(8.dp)
                        .clip(UiShapes.pill)
                        .background(accentColor),
                )
            }
        }
    }
}

@Composable
private fun TrajectoryCard(item: LearningTrajectoryItem, onIntent: (DiagnosticsIntent) -> Unit) {
    Card(
        shape = UiShapes.cardLg,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = UiOpacity.scrimOverlay), UiShapes.cardLg),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(UiSpacing.md),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            Text(
                text = item.courseTitle ?: "Рекомендация по навыку",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = item.reason,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            val slug = item.courseSlug
            if (slug != null) {
                Button(
                    onClick = rememberTremorFilteredOnClick { onIntent(DiagnosticsIntent.OpenRecommendedCourse(slug)) },
                    shape = UiShapes.cardMd,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = "Открыть курс",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(vertical = UiSpacing.xxs),
                    )
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
