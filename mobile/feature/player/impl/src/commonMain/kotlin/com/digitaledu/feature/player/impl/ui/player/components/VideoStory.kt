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
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.digitaledu.core.model.content.VideoPayload
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.feature.player.api.PlayerIntent
import digital_education_mobile.feature.player.`impl`.generated.resources.Res
import digital_education_mobile.feature.player.`impl`.generated.resources.video_duration
import digital_education_mobile.feature.player.`impl`.generated.resources.video_no_transcript
import digital_education_mobile.feature.player.`impl`.generated.resources.video_title
import digital_education_mobile.feature.player.`impl`.generated.resources.video_transcript_title
import digital_education_mobile.feature.player.`impl`.generated.resources.video_unavailable_message
import digital_education_mobile.feature.player.`impl`.generated.resources.video_unavailable_title
import org.jetbrains.compose.resources.stringResource

@Composable
fun VideoStory(
    payload: VideoPayload,
    onIntent: (PlayerIntent) -> Unit,
    resolveUrl: (String) -> String,
    modifier: Modifier = Modifier,
) {
    var showTranscriptFallback by remember(payload.videoUrl) { mutableStateOf(payload.videoUrl.isBlank()) }
    val state = remember(payload.durationSec, payload.transcript, payload.videoUrl, resolveUrl) {
        buildVideoStoryState(
            durationSec = payload.durationSec,
            transcript = payload.transcript,
            videoUrl = payload.videoUrl,
            resolveUrl = resolveUrl,
        )
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.scrim)
            .padding(UiSpacing.lg),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = UiShapes.cardLg,
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLowest,
            ),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(UiSpacing.lg),
                verticalArrangement = Arrangement.spacedBy(UiSpacing.md),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(220.dp)
                        .clip(UiShapes.cardLg)
                        .background(MaterialTheme.colorScheme.surfaceContainerHighest),
                    contentAlignment = Alignment.Center,
                ) {
                    val resolvedVideoUrl = state.resolvedVideoUrl
                    if (showTranscriptFallback || resolvedVideoUrl == null) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                            modifier = Modifier.padding(UiSpacing.md),
                        ) {
                            Text(
                                text = stringResource(Res.string.video_unavailable_title),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                text = stringResource(Res.string.video_unavailable_message),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center,
                            )
                        }
                    } else {
                        NativeVideoPlayer(
                            videoUrl = resolvedVideoUrl,
                            onPlaybackError = { showTranscriptFallback = true },
                            modifier = Modifier.fillMaxSize(),
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = stringResource(Res.string.video_title),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = stringResource(Res.string.video_duration, state.durationLabel),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                }

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                ) {
                    Text(
                        text = stringResource(Res.string.video_transcript_title),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        text = if (state.hasTranscript) {
                            state.transcriptPreview
                        } else {
                            stringResource(Res.string.video_no_transcript)
                        },
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 5,
                        overflow = TextOverflow.Ellipsis,
                        textAlign = TextAlign.Start,
                    )
                }
            }
        }
    }
}
