package com.digitaledu.feature.player.impl.ui.player.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Segmented progress bar resembling Instagram Stories.
 *
 * @param stepsCount Total number of steps (segments).
 * @param currentStep Current active step (0-based).
 * @param modifier Modifier for the container.
 * @param spacing Spacing between segments.
 * @param stepHeight Height of the progress bar.
 * @param activeColor Color of completed/active steps.
 * @param inactiveColor Color of upcoming steps.
 */
@Composable
fun StoryStepsProgressBar(
    stepsCount: Int,
    currentStep: Int,
    modifier: Modifier = Modifier,
    spacing: Dp = 4.dp,
    stepHeight: Dp = 4.dp,
    activeColor: Color = MaterialTheme.colorScheme.onSurface,
    inactiveColor: Color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(stepHeight),
        horizontalArrangement = Arrangement.spacedBy(spacing)
    ) {
        repeat(stepsCount) { index ->
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(stepHeight / 2)) // Pill shape
                    .background(
                        when {
                            index < currentStep -> activeColor // Completed
                            index == currentStep -> activeColor // Current (Active)
                            else -> inactiveColor // Future
                        }
                    )
            )
        }
    }
}
