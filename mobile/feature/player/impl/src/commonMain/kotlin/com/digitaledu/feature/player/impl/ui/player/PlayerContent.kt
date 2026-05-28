package com.digitaledu.feature.player.impl.ui.player

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
import com.digitaledu.core.ui.components.UiOpacity
import com.digitaledu.core.ui.components.UiSpacing
import com.digitaledu.core.model.catalog.CatalogScreen
import com.digitaledu.core.model.content.ArticlePayload
import com.digitaledu.core.model.content.CheatSheetPayload
import com.digitaledu.core.model.content.Hotspot
import com.digitaledu.core.model.content.QuizPayload
import com.digitaledu.core.model.content.SimulationPayload
import com.digitaledu.core.model.content.UnknownPayload
import com.digitaledu.core.model.content.VideoPayload
import com.digitaledu.feature.player.api.PlayerIntent
import com.digitaledu.feature.player.impl.ui.player.components.ArticleStory
import com.digitaledu.feature.player.impl.ui.player.components.LessonCheatSheetView
import com.digitaledu.feature.player.impl.ui.player.components.QuizStory
import com.digitaledu.feature.player.impl.ui.player.components.VideoStory

@Composable
fun PlayerContent(
    screen: CatalogScreen,
    mediaAccessToken: String?,
    activeHotspotHint: Hotspot?,
    isCurrentMemoSaved: Boolean,
    isCurrentScreen: Boolean = true,
    onIntent: (PlayerIntent) -> Unit,
    resolveUrl: (String) -> String,
    modifier: Modifier = Modifier,
) {
    when (val payload = screen.payload) {
        is SimulationPayload -> {
            SimulationScreen(
                screenTitle = screen.title,
                payload = payload,
                isCurrentScreen = isCurrentScreen,
                accessToken = mediaAccessToken,
                activeHotspotHint = activeHotspotHint,
                onResolveImageUrl = resolveUrl,
                onHotspotClick = { onIntent(PlayerIntent.ClickHotspot(it)) },
                onDismissHint = { onIntent(PlayerIntent.DismissHotspotHint) },
                onAutoAdvance = {
                    val simPayload = screen.payload as? SimulationPayload
                    if (simPayload?.isCompletion == true && simPayload.hotspots.isEmpty()) {
                        onIntent(PlayerIntent.FinishLesson)
                    } else {
                        onIntent(PlayerIntent.Next)
                    }
                },
                onRecordError = { hintLevel ->
                    onIntent(PlayerIntent.RecordSimulationError(hintLevel))
                },
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
            LessonCheatSheetView(
                title = screen.title,
                payload = payload,
                isSaved = isCurrentMemoSaved,
                onToggleSave = { onIntent(PlayerIntent.ToggleMemoSaved) },
                modifier = modifier.fillMaxSize(),
            )
        }
        is UnknownPayload -> {
            Column(
                modifier = modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = UiSpacing.xl, vertical = UiSpacing.xxl),
                verticalArrangement = Arrangement.spacedBy(UiSpacing.lg),
            ) {
                Text(
                    text = screen.title,
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                )

                Spacer(modifier = Modifier.height(UiSpacing.xs))

                Text(
                    text = payload.raw,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = UiOpacity.textSecondaryOnScrim),
                )
            }
        }
    }
}
