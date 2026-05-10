package com.digitaledu.feature.player.impl.ui.player.components

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.digitaledu.core.model.content.ArticlePayload
import com.digitaledu.feature.player.api.PlayerIntent
import com.mikepenz.markdown.m3.Markdown
import kotlinx.coroutines.launch

@Composable
fun ArticleStory(
    title: String,
    payload: ArticlePayload,
    onIntent: (PlayerIntent) -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()
    val scope = rememberCoroutineScope()

    Box(
        modifier = modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = { offset ->
                        val width = size.width
                        if (offset.x < width * 0.25f) {
                            onIntent(PlayerIntent.Previous)
                        } else {
                            if (scrollState.canScrollForward) {
                                scope.launch {
                                    scrollState.animateScrollTo(
                                        scrollState.value + (size.height * 0.8).toInt()
                                    )
                                }
                            } else {
                                onIntent(PlayerIntent.Next)
                            }
                        }
                    }
                )
            }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 24.dp, vertical = 24.dp)
                .padding(bottom = 80.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold
                ),
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(24.dp))

            Markdown(
                content = payload.markdownContent,
            )
        }
    }
}
