package com.digitaledu.feature.player.impl.ui.player.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.digitaledu.feature.player.impl.ui.LessonSummaryState
import digital_education_mobile.feature.player.`impl`.generated.resources.Res
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_summary_complete_title
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_summary_continue
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_summary_finish
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_summary_next
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_summary_progress
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_summary_subtitle
import digital_education_mobile.feature.player.`impl`.generated.resources.lesson_summary_title
import org.jetbrains.compose.resources.stringResource

@Composable
internal fun LessonSummaryView(
    state: LessonSummaryState,
    onContinue: () -> Unit,
    onFinish: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = UiSpacing.lg, vertical = UiSpacing.xxl),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Card(
            shape = UiShapes.cardLg,
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(UiSpacing.xl),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
            ) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(UiShapes.pill)
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.CheckCircle,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.size(44.dp),
                    )
                }

                Text(
                    text = stringResource(
                        if (state.isCourseComplete) {
                            Res.string.lesson_summary_complete_title
                        } else {
                            Res.string.lesson_summary_title
                        },
                    ),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = stringResource(
                        Res.string.lesson_summary_subtitle,
                        state.lessonTitle,
                        state.courseTitle,
                    ),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )

                LinearProgressIndicator(
                    progress = { state.progressPercent / 100f },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(10.dp)
                        .clip(UiShapes.pill),
                )
                Text(
                    text = stringResource(
                        Res.string.lesson_summary_progress,
                        state.completedSteps,
                        state.totalSteps,
                        state.progressPercent,
                    ) + "%",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                )

                state.nextLessonTitle?.let { nextTitle ->
                    Text(
                        text = stringResource(Res.string.lesson_summary_next, nextTitle),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                    )
                }

                Spacer(modifier = Modifier.height(UiSpacing.xs))

                if (state.hasNextLesson) {
                    Button(
                        onClick = onContinue,
                        shape = UiShapes.cardMd,
                        modifier = Modifier
                            .fillMaxWidth()
                            .accessibilityTouchTarget
                            .accessibilitySemantics(label = stringResource(Res.string.lesson_summary_continue)),
                    ) {
                        Text(text = stringResource(Res.string.lesson_summary_continue))
                    }
                }

                OutlinedButton(
                    onClick = onFinish,
                    shape = UiShapes.cardMd,
                    modifier = Modifier
                        .fillMaxWidth()
                        .accessibilityTouchTarget
                        .accessibilitySemantics(label = stringResource(Res.string.lesson_summary_finish)),
                ) {
                    Text(text = stringResource(Res.string.lesson_summary_finish))
                }
            }
        }
    }
}
