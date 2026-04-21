package com.digitaledu.feature.player.impl.ui.player.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import com.digitaledu.core.ui.components.UiOpacity
import com.digitaledu.core.ui.components.UiShapes
import com.digitaledu.core.ui.components.UiSpacing

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
    spacing: Dp = UiSpacing.xxs,
    stepHeight: Dp = UiSpacing.xxs,
    activeColor: Color = MaterialTheme.colorScheme.onSurface,
    inactiveColor: Color = MaterialTheme.colorScheme.onSurface.copy(alpha = UiOpacity.medium)
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
                    .clip(UiShapes.pill)
                    .background(
                        when {
                            index < currentStep -> activeColor
                            index == currentStep -> activeColor
                            else -> inactiveColor
                        }
                    )
            )
        }
    }
}
