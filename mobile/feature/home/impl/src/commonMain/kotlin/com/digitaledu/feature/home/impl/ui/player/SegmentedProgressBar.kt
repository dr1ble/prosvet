package com.digitaledu.feature.home.impl.ui.player

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp

/**
 * Segmented progress bar where each screen is a visual segment.
 * Completed screens are highlighted in green.
 * 
 * Material 3 design with animated segments.
 */
@Composable
fun SegmentedProgressBar(
    totalScreens: Int,
    currentScreenIndex: Int,
    completedScreens: Set<Int>,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(8.dp)
            .clip(RoundedCornerShape(100)),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        repeat(totalScreens) { index ->
            val isCompleted = index in completedScreens
            val isCurrent = index == currentScreenIndex
            
            // Animate segment color
            val targetAlpha = when {
                isCompleted -> 1f
                isCurrent -> 0.7f
                else -> 0.2f
            }
            
            val animatedAlpha = animateFloatAsState(
                targetValue = targetAlpha,
                animationSpec = spring(
                    dampingRatio = Spring.DampingRatioMediumBouncy,
                    stiffness = Spring.StiffnessLow
                ),
                label = "segment_$index"
            )
            
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(8.dp)
                    .clip(RoundedCornerShape(100))
                    .background(
                        color = when {
                            isCompleted -> MaterialTheme.colorScheme.tertiary.copy(alpha = animatedAlpha.value)
                            isCurrent -> MaterialTheme.colorScheme.primary.copy(alpha = animatedAlpha.value)
                            else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = animatedAlpha.value)
                        }
                    )
            )
        }
    }
}
