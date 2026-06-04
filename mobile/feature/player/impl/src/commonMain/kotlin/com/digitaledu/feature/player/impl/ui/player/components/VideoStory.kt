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
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.OpenInFull
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.digitaledu.core.model.content.VideoPayload
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing
import digital_education_mobile.feature.player.`impl`.generated.resources.Res
import digital_education_mobile.feature.player.`impl`.generated.resources.video_fullscreen_badge
import digital_education_mobile.feature.player.`impl`.generated.resources.video_exit_fullscreen
import digital_education_mobile.feature.player.`impl`.generated.resources.video_no_transcript
import digital_education_mobile.feature.player.`impl`.generated.resources.video_title
import digital_education_mobile.feature.player.`impl`.generated.resources.video_transcript_title
import digital_education_mobile.feature.player.`impl`.generated.resources.video_unavailable_message
import digital_education_mobile.feature.player.`impl`.generated.resources.video_unavailable_title
import org.jetbrains.compose.resources.stringResource

@Composable
fun VideoStory(
    payload: VideoPayload,
    onIntent: (com.digitaledu.feature.player.api.PlayerIntent) -> Unit,
    resolveUrl: (String) -> String,
    modifier: Modifier = Modifier,
) {
    var showTranscriptFallback by remember(payload.videoUrl) { mutableStateOf(payload.videoUrl.isBlank()) }
    var isVideoFullscreen by remember(payload.videoUrl) { mutableStateOf(false) }
    var isFullscreenControlsVisible by remember(payload.videoUrl) { mutableStateOf(true) }
    val state = remember(payload.durationSec, payload.transcript, payload.videoUrl, resolveUrl) {
        buildVideoStoryState(
            durationSec = payload.durationSec,
            transcript = payload.transcript,
            videoUrl = payload.videoUrl,
            resolveUrl = resolveUrl,
        )
    }
    val resolvedVideoUrl = state.resolvedVideoUrl

    if (isVideoFullscreen && !showTranscriptFallback && resolvedVideoUrl != null) {
        VideoFullscreenEffect(isFullscreen = true)

        Dialog(
            onDismissRequest = { isVideoFullscreen = false },
            properties = DialogProperties(usePlatformDefaultWidth = false),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black),
            ) {
                NativeVideoPlayer(
                    videoUrl = resolvedVideoUrl,
                    onPlaybackError = {
                        showTranscriptFallback = true
                        isVideoFullscreen = false
                    },
                    onControlsVisibilityChanged = { isVisible ->
                        isFullscreenControlsVisible = isVisible
                    },
                    modifier = Modifier.fillMaxSize(),
                )

                if (isFullscreenControlsVisible) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .systemBarsPadding()
                            .padding(UiSpacing.sm)
                            .clip(RoundedCornerShape(20.dp))
                            .clickable { isVideoFullscreen = false },
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.scrim.copy(alpha = 0.68f),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = UiSpacing.sm, vertical = UiSpacing.xs),
                            horizontalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimary,
                            )
                            Text(
                                text = stringResource(Res.string.video_exit_fullscreen),
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                        }
                    }
                }
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(UiSpacing.lg),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .shadow(
                    elevation = 18.dp,
                    shape = UiShapes.cardLg,
                    ambientColor = Color.Black.copy(alpha = 0.12f),
                    spotColor = Color.Black.copy(alpha = 0.18f),
                ),
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

                        Surface(
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(UiSpacing.sm)
                                .clip(UiShapes.cardMd)
                                .clickable { isVideoFullscreen = true },
                            shape = UiShapes.cardMd,
                            color = MaterialTheme.colorScheme.scrim.copy(alpha = 0.68f),
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = UiSpacing.sm, vertical = UiSpacing.xs),
                                horizontalArrangement = Arrangement.spacedBy(UiSpacing.xs),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    imageVector = Icons.Default.OpenInFull,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onPrimary,
                                )
                                Text(
                                    text = stringResource(Res.string.video_fullscreen_badge),
                                    style = MaterialTheme.typography.labelLarge,
                                    color = MaterialTheme.colorScheme.onPrimary,
                                )
                            }
                        }
                    }
                }

                Text(
                    text = stringResource(Res.string.video_title),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.fillMaxWidth(),
                )

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
