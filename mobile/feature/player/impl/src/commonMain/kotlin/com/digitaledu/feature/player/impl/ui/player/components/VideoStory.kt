package com.digitaledu.feature.player.impl.ui.player.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import com.digitaledu.core.ui.components.UiOpacity
import com.digitaledu.core.model.content.VideoPayload
import com.digitaledu.feature.player.api.PlayerIntent
import digital_education_mobile.feature.player.`impl`.generated.resources.Res
import digital_education_mobile.feature.player.`impl`.generated.resources.video_debug_text
import digital_education_mobile.feature.player.`impl`.generated.resources.video_play
import digital_education_mobile.feature.player.`impl`.generated.resources.video_state_paused
import digital_education_mobile.feature.player.`impl`.generated.resources.video_state_playing
import org.jetbrains.compose.resources.stringResource

@Composable
fun VideoStory(
    payload: VideoPayload,
    onIntent: (PlayerIntent) -> Unit,
    resolveUrl: (String) -> String,
    modifier: Modifier = Modifier
) {
    var isPlaying by remember { mutableStateOf(true) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.scrim)
            .clickable { isPlaying = !isPlaying },
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    if (isPlaying) {
                        MaterialTheme.colorScheme.surfaceContainerHighest
                    } else {
                        MaterialTheme.colorScheme.scrim
                    },
                )
        )

        val playbackStateText = if (isPlaying) {
            stringResource(Res.string.video_state_playing)
        } else {
            stringResource(Res.string.video_state_paused)
        }

        Text(
            text = stringResource(Res.string.video_debug_text, payload.videoUrl, playbackStateText),
            color = MaterialTheme.colorScheme.onPrimary,
            style = MaterialTheme.typography.bodyLarge
        )

        if (!isPlaying) {
             Icon(
                 imageVector = Icons.Default.PlayArrow,
                 contentDescription = stringResource(Res.string.video_play),
                 tint = MaterialTheme.colorScheme.onPrimary.copy(alpha = UiOpacity.textSecondaryOnScrim),
                 modifier = Modifier.align(Alignment.Center).fillMaxSize(0.2f)
             )
        }
    }
}
