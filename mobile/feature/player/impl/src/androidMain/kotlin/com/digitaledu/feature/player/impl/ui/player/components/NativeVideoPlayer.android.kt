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
import androidx.media3.ui.PlayerView.ControllerVisibilityListener
import com.digitaledu.feature.player.impl.domain.VideoPlaybackSource
import com.digitaledu.feature.player.impl.domain.resolveVideoPlaybackSource
import kotlinx.coroutines.delay

@OptIn(UnstableApi::class)
@Composable
internal actual fun NativeVideoPlayer(
    videoUrl: String,
    onPlaybackError: () -> Unit,
    onControlsVisibilityChanged: (Boolean) -> Unit,
    modifier: Modifier,
) {
    val context = LocalContext.current
    val currentOnPlaybackError by rememberUpdatedState(onPlaybackError)
    val currentOnControlsVisibilityChanged by rememberUpdatedState(onControlsVisibilityChanged)
    val playbackSource = remember(videoUrl) { resolveVideoPlaybackSource(videoUrl) }

    val directUrl = (playbackSource as? VideoPlaybackSource.Direct)?.url
    if (directUrl == null) {
        LaunchedEffect(Unit) { currentOnPlaybackError() }
        return
    }

    var isReady by remember(directUrl) { mutableStateOf(false) }
    var didFallback by remember(directUrl) { mutableStateOf(false) }
    val player = remember(directUrl) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(directUrl))
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
            currentOnControlsVisibilityChanged(false)
            player.release()
        }
    }

    LaunchedEffect(player, directUrl) {
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
                setControllerVisibilityListener(ControllerVisibilityListener { visibility ->
                    currentOnControlsVisibilityChanged(visibility == android.view.View.VISIBLE)
                })
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
            }
        },
        update = { view ->
            view.player = player
            currentOnControlsVisibilityChanged(view.isControllerFullyVisible)
        },
    )
}

private const val VideoLoadTimeoutMillis = 15_000L
