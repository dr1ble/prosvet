package com.digitaledu.feature.player.impl.ui.player.components

import androidx.compose.foundation.layout.Box
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier

@Composable
internal actual fun NativeVideoPlayer(
    videoUrl: String,
    onPlaybackError: () -> Unit,
    modifier: Modifier,
) {
    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Text(
            text = "Видео для iOS будет добавлено в следующей версии",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
