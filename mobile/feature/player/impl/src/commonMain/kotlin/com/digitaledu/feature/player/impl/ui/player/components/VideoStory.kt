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

/**
 * Stories-style Video Player.
 * 
 * Features:
 * - Autoplay when visible (handled by parent logic or lifecycle).
 * - Tap center to Pause/Play.
 * - Tap edges are handled by parent Pager (Next/Prev).
 */
@Composable
fun VideoStory(
    payload: VideoPayload,
    onIntent: (PlayerIntent) -> Unit,
    resolveUrl: (String) -> String,
    modifier: Modifier = Modifier
) {
    var isPlaying by remember { mutableStateOf(true) }
    
    // Placeholder for actual ExoPlayer/AVPlayer implementation.
    // For now, simulating the UI state.

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.scrim)
            // Center tap toggles playback
            .clickable { isPlaying = !isPlaying },
        contentAlignment = Alignment.Center
    ) {
        // Video Surface Placeholder
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
        
        // Debug Text
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
        
        // Play/Pause Icon Overlay (Visible when paused)
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
