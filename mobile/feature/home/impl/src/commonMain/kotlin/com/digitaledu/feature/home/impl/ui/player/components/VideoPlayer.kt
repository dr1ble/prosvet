package com.digitaledu.feature.home.impl.ui.player.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.digitaledu.core.model.ScreenPayload

/**
 * Renders a video player for the lesson.
 * 
 * TODO: Integrate with ExoPlayer (Android) / AVPlayer (iOS) via KMP wrapper.
 */
@Composable
fun VideoPlayer(
    payload: ScreenPayload.Video,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surfaceVariant),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "Video Placeholder\n${payload.videoUrl}",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
