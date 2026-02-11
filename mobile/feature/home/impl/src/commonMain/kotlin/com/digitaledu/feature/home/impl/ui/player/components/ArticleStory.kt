package com.digitaledu.feature.home.impl.ui.player.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.digitaledu.core.model.ScreenPayload
import com.digitaledu.feature.home.impl.player.PlayerIntent
import kotlinx.coroutines.launch

/**
 * Stories-style Article viewer.
 * 
 * Logic:
 * - Vertical scroll for long content.
 * - Tap Right (75% width): Scroll down page-by-page. If at bottom -> Next screen.
 * - Tap Left (25% width): Previous screen.
 */
@Composable
fun ArticleStory(
    title: String,
    payload: ScreenPayload.Article,
    onIntent: (PlayerIntent) -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()
    val scope = rememberCoroutineScope()
    // val density = LocalDensity.current 
    
    // Content rendering using basic Text for now.
    
    Box(
        modifier = modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = { offset ->
                        val width = size.width
                        val isRightTap = offset.x > width * 0.35f // 35% left margin for back, 65% for fwd? 
                        // Standard Stories: Left 20-30% is Back. Rest is Fwd.
                        // Design doc says: Left 25%, Right 75%.
                        
                        if (offset.x < width * 0.25f) {
                            // Left Zone -> Previous
                            onIntent(PlayerIntent.Previous)
                        } else {
                            // Right Zone (75%) -> Scroll or Next
                            if (scrollState.canScrollForward) {
                                // Scroll down by ~80% of screen height
                                scope.launch {
                                    scrollState.animateScrollTo(
                                        (scrollState.value + (size.height * 0.8).toInt())
                                    )
                                }
                            } else {
                                // At bottom -> Next
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
                // Add extra padding at bottom to ensure easy reading of last lines
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
            
            Text(
                text = payload.markdownContent,
                style = MaterialTheme.typography.bodyLarge.copy(
                    lineHeight = MaterialTheme.typography.bodyLarge.lineHeight * 1.4
                ),
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.9f)
            )
        }
    }
}
