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
import com.digitaledu.core.model.ScreenPayload

/**
 * Renders the lesson content for the current screen based on payload type.
 * 
 * Supported content types:
 * - `ScreenPayload.Simulation`: Interactive simulation with clickable hotspots
 * - `ScreenPayload.Unknown`: Fallback text-based rendering
 * 
 * @param screen The screen data containing title and typed payload
 * @param baseUrl Base URL for loading images and media resources
 * @param onNavigateToScreen Callback to navigate to a screen by its screenKey
 */
@Composable
fun PlayerContent(
    screen: CatalogScreen,
    baseUrl: String,
    mediaAccessToken: String?,
    onNavigateToScreen: (screenKey: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    when (val payload = screen.payload) {
        is ScreenPayload.Simulation -> {
            // Render interactive simulation
            SimulationScreen(
                payload = payload,
                baseUrl = baseUrl,
                accessToken = mediaAccessToken,
                onNavigateToScreen = onNavigateToScreen,
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
