package com.digitaledu.feature.home.impl.ui.player

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.digitaledu.core.model.CatalogScreen
import com.digitaledu.core.model.Hotspot
import com.digitaledu.core.model.ScreenPayload
import com.digitaledu.feature.home.impl.player.PlayerIntent
import com.digitaledu.feature.home.impl.ui.player.components.ArticleViewer
import com.digitaledu.feature.home.impl.ui.player.components.QuizView
import com.digitaledu.feature.home.impl.ui.player.components.VideoPlayer

/**
 * Renders the lesson content for the current screen based on payload type.
 * 
 * Supported content types:
 * - `ScreenPayload.Simulation`: Interactive simulation with clickable hotspots
 * - `ScreenPayload.Unknown`: Fallback text-based rendering
 * 
 * @param screen The screen data containing title and typed payload
 * @param mediaAccessToken Token for accessing media
 * @param activeHotspotHint Currently active hint to display
 * @param onIntent Callback for processing user intents
 * @param resolveUrl Callback to resolve full URLs for media
 */
@Composable
fun PlayerContent(
    screen: CatalogScreen,
    mediaAccessToken: String?,
    activeHotspotHint: Hotspot?,
    onIntent: (PlayerIntent) -> Unit,
    resolveUrl: (String) -> String,
    modifier: Modifier = Modifier,
) {
    when (val payload = screen.payload) {
        is ScreenPayload.Simulation -> {
            // Render interactive simulation
            SimulationScreen(
                payload = payload,
                accessToken = mediaAccessToken,
                activeHotspotHint = activeHotspotHint,
                onResolveImageUrl = resolveUrl,
                onHotspotClick = { onIntent(PlayerIntent.ClickHotspot(it)) },
                onDismissHint = { onIntent(PlayerIntent.DismissHotspotHint) },
                modifier = modifier,
            )
        }
        is ScreenPayload.Video -> {
            VideoPlayer(
                payload = payload,
                modifier = modifier,
            )
        }
        is ScreenPayload.Article -> {
            ArticleViewer(
                title = screen.title,
                payload = payload,
                modifier = modifier,
            )
        }
        is ScreenPayload.Quiz -> {
            QuizView(
                payload = payload,
                onQuizCompleted = { 
                    // TODO: Handle quiz completion logic (unlock next screen, save cheat sheet)
                    onIntent(PlayerIntent.Next) 
                },
                modifier = modifier,
            )
        }
        is ScreenPayload.Unknown -> {
            // Fallback: show title + raw content
            Column(
                modifier = modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 24.dp, vertical = 32.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                Text(
                    text = screen.title,
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = payload.raw,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.87f),
                )
            }
        }
    }
}
