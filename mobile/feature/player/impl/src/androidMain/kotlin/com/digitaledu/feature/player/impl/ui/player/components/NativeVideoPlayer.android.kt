package com.digitaledu.feature.player.impl.ui.player.components

import android.view.ViewGroup
import androidx.annotation.OptIn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay

@OptIn(UnstableApi::class)
@Composable
internal actual fun NativeVideoPlayer(
    videoUrl: String,
    onPlaybackError: () -> Unit,
    modifier: Modifier,
) {
    val context = LocalContext.current
    val currentOnPlaybackError by rememberUpdatedState(onPlaybackError)
    var isReady by remember(videoUrl) { mutableStateOf(false) }
    var didFallback by remember(videoUrl) { mutableStateOf(false) }
    val player = remember(videoUrl) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(videoUrl))
            prepare()
        }
    }

    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_READY) {
                    isReady = true
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                if (!didFallback) {
                    didFallback = true
                    currentOnPlaybackError()
                }
            }
        }
        player.addListener(listener)
        onDispose {
            player.removeListener(listener)
            player.release()
        }
    }

    LaunchedEffect(player, videoUrl) {
        delay(VideoLoadTimeoutMillis)
        if (!isReady && !didFallback) {
            didFallback = true
            currentOnPlaybackError()
        }
    }

    AndroidView(
        modifier = modifier,
        factory = { viewContext ->
            PlayerView(viewContext).apply {
                this.player = player
                useController = true
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
            }
        },
        update = { view ->
            view.player = player
        },
    )
}

private const val VideoLoadTimeoutMillis = 15_000L
