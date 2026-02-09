package com.digitaledu.feature.home.impl.ui.player

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.animation.SizeTransform
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.digitaledu.core.model.CatalogBundle
import kotlinx.coroutines.delay
import kotlin.math.abs

/**
 * Fullscreen lesson player screen with immersive content display.
 * 
 * Follows compose-expert patterns:
 * - State hoisting (state up, events down)
 * - Auto-hide controls with LaunchedEffect
 * - Material 3 theming
 * 
 * @param bundle The lesson bundle to display
 * @param currentScreenIndex Current screen position (0-based)
 * @param onExit Callback when user exits player
 * @param onPreviousScreen Navigate to previous screen
 * @param onNextScreen Navigate to next screen
 */
@Composable
fun LessonPlayerScreen(
    bundle: CatalogBundle,
    currentScreenIndex: Int,
    baseUrl: String,
    mediaAccessToken: String?,
    completedScreens: Set<Int> = emptySet(),
    onExit: () -> Unit,
    onPreviousScreen: () -> Unit,
    onNextScreen: () -> Unit,
    onNavigateToScreen: (screenKey: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    // Auto-hide controls after 3 seconds of inactivity
    var controlsVisible by remember { mutableStateOf(true) }
    
    LaunchedEffect(currentScreenIndex) {
        controlsVisible = true
        delay(3000)
        controlsVisible = false
    }
    
    val canGoPrevious = currentScreenIndex > 0
    val canGoNext = currentScreenIndex < bundle.screens.lastIndex
    val currentScreen = bundle.screens.getOrNull(currentScreenIndex)
    val progress = (currentScreenIndex + 1).toFloat() / bundle.screens.size.toFloat()
    
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
    ) {
        // Main content area with animated transitions and gesture support
        androidx.compose.animation.AnimatedContent(
            targetState = currentScreenIndex,
            transitionSpec = {
                // Slide direction based on navigation
                if (targetState > initialState) {
                    // Next: slide from right
                    androidx.compose.animation.slideInHorizontally { width -> width } + 
                        androidx.compose.animation.fadeIn() togetherWith
                        androidx.compose.animation.slideOutHorizontally { width -> -width } + 
                        androidx.compose.animation.fadeOut()
                } else {
                    // Previous: slide from left
                    androidx.compose.animation.slideInHorizontally { width -> -width } + 
                        androidx.compose.animation.fadeIn() togetherWith
                        androidx.compose.animation.slideOutHorizontally { width -> width } + 
                        androidx.compose.animation.fadeOut()
                } using androidx.compose.animation.SizeTransform(clip = false)
            },
            label = "screen_transition",
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 80.dp)
                .pointerInput(Unit) {
                    // Tap to toggle controls
                    detectTapGestures(
                        onTap = {
                            controlsVisible = !controlsVisible
                        }
                    )
                }
                .pointerInput(Unit) {
                    // Swipe for navigation
                    val swipeThreshold = 50.dp.toPx()
                    
                    detectHorizontalDragGestures(
                        onDragEnd = {
                            // Gesture finished
                        }
                    ) { change, dragAmount ->
                        change.consume()
                        
                        if (abs(dragAmount) > swipeThreshold) {
                            if (dragAmount < 0 && canGoNext) {
                                // Swipe left -> Next
                                onNextScreen()
                            } else if (dragAmount > 0 && canGoPrevious) {
                                // Swipe right -> Previous  
                                onPreviousScreen()
                            }
                        }
                    }
                },
        ) { screenIndex ->
            val screen = bundle.screens.getOrNull(screenIndex)
            if (screen != null) {
                PlayerContent(
                    screen = screen,
                    baseUrl = baseUrl,
                    mediaAccessToken = mediaAccessToken,
                    onNavigateToScreen = onNavigateToScreen,
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
        
        // Floating top bar with enhanced animations
        AnimatedVisibility(
            visible = controlsVisible,
            enter = fadeIn(
                animationSpec = androidx.compose.animation.core.tween(
                    durationMillis = 300,
                    easing = androidx.compose.animation.core.FastOutSlowInEasing
                )
            ) + androidx.compose.animation.scaleIn(
                initialScale = 0.92f,
                animationSpec = androidx.compose.animation.core.tween(
                    durationMillis = 300,
                    easing = androidx.compose.animation.core.FastOutSlowInEasing
                )
            ),
            exit = fadeOut(
                animationSpec = androidx.compose.animation.core.tween(
                    durationMillis = 250,
                    easing = androidx.compose.animation.core.FastOutLinearInEasing
                )
            ) + androidx.compose.animation.scaleOut(
                targetScale = 0.92f,
                animationSpec = androidx.compose.animation.core.tween(
                    durationMillis = 250,
                    easing = androidx.compose.animation.core.FastOutLinearInEasing
                )
            ),
            modifier = Modifier.align(Alignment.TopCenter)
        ) {
            PlayerTopBar(
                courseTitle = bundle.course.title,
                onExit = onExit,
                modifier = Modifier.padding(16.dp)
            )
        }
        
        // Bottom controls with enhanced animations
        AnimatedVisibility(
            visible = controlsVisible,
            enter = fadeIn(
                animationSpec = androidx.compose.animation.core.tween(
                    durationMillis = 300,
                    easing = androidx.compose.animation.core.FastOutSlowInEasing
                )
            ) + androidx.compose.animation.slideInVertically(
                initialOffsetY = { it / 4 },
                animationSpec = androidx.compose.animation.core.tween(
                    durationMillis = 300,
                    easing = androidx.compose.animation.core.FastOutSlowInEasing
                )
            ),
            exit = fadeOut(
                animationSpec = androidx.compose.animation.core.tween(
                    durationMillis = 250,
                    easing = androidx.compose.animation.core.FastOutLinearInEasing
                )
            ) + androidx.compose.animation.slideOutVertically(
                targetOffsetY = { it / 4 },
                animationSpec = androidx.compose.animation.core.tween(
                    durationMillis = 250,
                    easing = androidx.compose.animation.core.FastOutLinearInEasing
                )
            ),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            PlayerControls(
                currentScreen = currentScreenIndex + 1,
                totalScreens = bundle.screens.size,
                progress = progress,
                canGoPrevious = canGoPrevious,
                canGoNext = canGoNext,
                completedScreens = completedScreens,
                onPreviousScreen = onPreviousScreen,
                onNextScreen = onNextScreen,
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}
