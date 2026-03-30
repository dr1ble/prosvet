package com.digitaledu.feature.player.impl.ui.player

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.digitaledu.core.model.catalog.CatalogScreen
import com.digitaledu.core.model.content.ArticlePayload
import com.digitaledu.core.model.content.CheatSheetPayload
import com.digitaledu.core.model.content.Hotspot
import com.digitaledu.core.model.content.QuizPayload
import com.digitaledu.core.model.content.ScreenPayload
import com.digitaledu.core.model.content.SimulationPayload
import com.digitaledu.core.model.content.UnknownPayload
import com.digitaledu.core.model.content.VideoPayload
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.impl.ui.player.components.ArticleStory
import com.digitaledu.feature.player.impl.ui.player.components.LessonCheatSheetView
import com.digitaledu.feature.player.impl.ui.player.components.QuizStory
import com.digitaledu.feature.player.impl.ui.player.components.VideoStory
import com.digitaledu.core.model.reference.LessonReference

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
    activeLessonReference: LessonReference?,
    onIntent: (PlayerIntent) -> Unit,
    resolveUrl: (String) -> String,
    modifier: Modifier = Modifier,
) {
    when (val payload = screen.payload) {
        is SimulationPayload -> {
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
        is VideoPayload -> {
            VideoStory(
                payload = payload,
                onIntent = onIntent,
                resolveUrl = resolveUrl,
                modifier = modifier,
            )
        }
        is ArticlePayload -> {
            ArticleStory(
                title = screen.title,
                payload = payload,
                onIntent = onIntent,
                modifier = modifier,
            )
        }
        is QuizPayload -> {
            QuizStory(
                payload = payload,
                onIntent = onIntent,
                modifier = modifier,
            )
        }
        is CheatSheetPayload -> {
             if (activeLessonReference != null) {
                 LessonCheatSheetView(
                     reference = activeLessonReference,
                     modifier = modifier.fillMaxSize()
                 )
             } else {
                 // Loading or error state
                 Box(
                     modifier = modifier.fillMaxSize(),
                     contentAlignment = Alignment.Center
                 ) {
                     CircularProgressIndicator()
                 }
             }
        }
        is UnknownPayload -> {
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
