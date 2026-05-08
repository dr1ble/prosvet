package com.digitaledu.feature.player.impl.ui.player.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
internal expect fun NativeVideoPlayer(
    videoUrl: String,
    onPlaybackError: () -> Unit,
    modifier: Modifier = Modifier,
)
