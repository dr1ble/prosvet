package com.digitaledu.feature.home.impl.ui.player

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp

/**
 * Bottom control bar for navigation and progress.
 * 
 * Material 3 design:
 * - Glassmorphism surface
 * - Linear progress indicator
 * - Screen counter
 * - Navigation buttons
 */
@Composable
fun PlayerControls(
    currentScreen: Int,
    totalScreens: Int,
    progress: Float,
    canGoPrevious: Boolean,
    canGoNext: Boolean,
    completedScreens: Set<Int> = emptySet(),
    onPreviousScreen: () -> Unit,
    onNextScreen: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
        shadowElevation = 12.dp,
        tonalElevation = 3.dp,
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Segment-based progress visualization
            SegmentedProgressBar(
                totalScreens = totalScreens,
                currentScreenIndex = currentScreen - 1, // Convert 1-based to 0-based
                completedScreens = completedScreens,
                modifier = Modifier.fillMaxWidth()
            )
            
            // Screen counter
            Text(
                text = "Экран $currentScreen из $totalScreens",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            )
            
            // Navigation buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                OutlinedButton(
                    onClick = onPreviousScreen,
                    enabled = canGoPrevious,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = null,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Назад")
                }
                
                Button(
                    onClick = onNextScreen,
                    enabled = canGoNext,
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Дальше")
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                    )
                }
            }
        }
    }
}
