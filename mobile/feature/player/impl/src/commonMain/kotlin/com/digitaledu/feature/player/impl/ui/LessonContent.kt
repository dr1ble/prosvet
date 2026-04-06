package com.digitaledu.feature.player.impl.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
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
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.model.content.ArticlePayload
import com.digitaledu.core.model.content.CheatSheetPayload
import com.digitaledu.core.model.content.QuizPayload
import com.digitaledu.core.model.content.ScreenPayload
import com.digitaledu.core.model.content.SimulationPayload
import com.digitaledu.core.model.content.UnknownPayload
import com.digitaledu.core.model.content.VideoPayload
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.api.PlayerUiState
import digital_education_mobile.feature.player.`impl`.generated.resources.Res
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_back_to_courses
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_choose_course_subtitle
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_choose_course_title
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_choose_other_course
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_continue_learning
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_screen_progress
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_screen_unavailable_subtitle
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_screen_unavailable_title
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_article
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_cheat_sheet
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_completion
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_hotspot_count_few
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_hotspot_count_many
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_hotspot_count_one
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_interactive_simulation
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_question_few
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_question_many
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_question_one
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_quiz
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_start_screen
import digital_education_mobile.feature.player.`impl`.generated.resources.payload_video
import org.jetbrains.compose.resources.stringResource

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
                .padding(horizontal = UiSpacing.lg, vertical = UiSpacing.xl),
            verticalArrangement = Arrangement.spacedBy(UiSpacing.sm),
        ) {
            Text(
                text = stringResource(Res.string.lesson_choose_course_title),
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                text = stringResource(Res.string.lesson_choose_course_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Button(onClick = { onIntent(PlayerIntent.Close) }) {
                Text(text = stringResource(Res.string.lesson_back_to_courses))
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
            .padding(horizontal = UiSpacing.md, vertical = UiSpacing.md),
        verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
    ) {
        // Single unified card with all information
        Card(
            shape = UiShapes.cardXl,
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant,
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        ) {
            Column(
                modifier = Modifier.padding(UiSpacing.lg),
                verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
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
                    verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                ) {
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(UiSpacing.xs)
                            .clip(UiShapes.pill),
                    )
                    Text(
                        text = stringResource(
                            Res.string.lesson_screen_progress,
                            uiState.currentScreenIndex + 1,
                            bundle.screens.size,
                        ),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                
                Spacer(modifier = Modifier.height(UiSpacing.xxs))
                
                // Current screen preview
                Column(
                    verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                ) {
                    Text(
                        text = currentScreen?.title
                            ?: stringResource(Res.string.lesson_screen_unavailable_title),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        text = currentScreen?.payload?.getPayloadPreview()
                            ?: stringResource(Res.string.lesson_screen_unavailable_subtitle),
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
            shape = UiShapes.cardMd,
        ) {
            Text(
                text = stringResource(Res.string.lesson_continue_learning),
                modifier = Modifier.padding(vertical = UiSpacing.xxs),
            )
        }

        // Secondary action: Choose another course
        OutlinedButton(
            onClick = { onIntent(PlayerIntent.Close) },
            modifier = Modifier.fillMaxWidth(),
            shape = UiShapes.cardMd,
        ) {
            Text(
                text = stringResource(Res.string.lesson_choose_other_course),
                modifier = Modifier.padding(vertical = UiSpacing.xxs),
            )
        }
    }
}

@Composable
private fun ScreenPayload.getPayloadPreview(): String {
    return when (this) {
        is SimulationPayload -> {
            val parts = mutableListOf(stringResource(Res.string.payload_interactive_simulation))
            if (hotspots.isNotEmpty()) {
                val hotspotLabel = when (hotspots.size) {
                    1 -> stringResource(Res.string.payload_hotspot_count_one, hotspots.size)
                    in 2..4 -> stringResource(Res.string.payload_hotspot_count_few, hotspots.size)
                    else -> stringResource(Res.string.payload_hotspot_count_many, hotspots.size)
                }
                parts += hotspotLabel
            }
            if (isStart) parts += stringResource(Res.string.payload_start_screen)
            if (isCompletion) parts += stringResource(Res.string.payload_completion)
            parts.joinToString(separator = " • ")
        }
        is VideoPayload -> {
            val minutes = durationSec / 60
            val seconds = durationSec % 60
            stringResource(
                Res.string.payload_video,
                "${minutes}:${seconds.toString().padStart(2, '0')}",
            )
        }
        is ArticlePayload -> {
            stringResource(Res.string.payload_article, markdownContent.length)
        }
        is QuizPayload -> {
            val questionWord = when (questions.size) {
                1 -> stringResource(Res.string.payload_question_one)
                in 2..4 -> stringResource(Res.string.payload_question_few)
                else -> stringResource(Res.string.payload_question_many)
            }
            stringResource(Res.string.payload_quiz, questions.size, questionWord)
        }
        is CheatSheetPayload -> {
            stringResource(Res.string.payload_cheat_sheet)
        }
        is UnknownPayload -> {
            if (raw.length <= 100) raw else "${raw.take(100)}..."
        }
    }
}
