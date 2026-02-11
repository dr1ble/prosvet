package com.digitaledu.feature.home.impl.ui.player.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.ui.graphics.Color
import com.digitaledu.core.model.ScreenPayload
import com.digitaledu.feature.home.impl.player.PlayerIntent

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
    payload: ScreenPayload.Video,
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
            .background(Color.Black)
            // Center tap toggles playback
            .clickable { isPlaying = !isPlaying },
        contentAlignment = Alignment.Center
    ) {
        // Video Surface Placeholder
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(if (isPlaying) Color.DarkGray else Color.Black)
        )
        
        // Debug Text
        Text(
            text = "Video: ${payload.videoUrl}\nState: ${if(isPlaying) "Playing" else "Paused"}",
            color = Color.White,
            style = MaterialTheme.typography.bodyLarge
        )
        
        // Play/Pause Icon Overlay (Visible when paused)
        if (!isPlaying) {
             androidx.compose.material3.Icon(
                 imageVector = androidx.compose.material.icons.Icons.Default.PlayArrow,
                 contentDescription = "Play",
                 tint = Color.White,
                 modifier = Modifier.align(Alignment.Center).fillMaxSize(0.2f)
             )
        }
    }
}
