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
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
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
import com.digitaledu.core.model.CodeSnippet
import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.Hotspot
import com.digitaledu.core.model.LessonReference
import com.digitaledu.core.model.ScreenPayload
import com.digitaledu.feature.home.impl.player.PlayerIntent
import com.digitaledu.feature.home.impl.ui.player.components.LessonCheatSheetView
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
 * @param onIntent Callback for processing user intents
 * @param resolveUrl Callback to resolve full URLs for media
 */
@Composable
fun LessonPlayerScreen(
    bundle: CatalogBundle,
    currentScreenIndex: Int,
    mediaAccessToken: String?,
    activeHotspotHint: Hotspot?,
    completedScreens: Set<Int> = emptySet(),
    onIntent: (PlayerIntent) -> Unit,
    resolveUrl: (String) -> String,
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
    
    // Check if current screen has context reference (Theory)
    val contextRef = remember(currentScreen) {
        (currentScreen?.payload as? ScreenPayload.Simulation)?.contextRef
    }

    // Bottom Sheet State for Theory logic
    @OptIn(ExperimentalMaterial3Api::class)
    val sheetState = rememberModalBottomSheetState()
    var showTheorySheet by remember { mutableStateOf(false) }

    // Mock Data for Theory (Temporary until backend ready)
    val mockLessonReference = remember {
        LessonReference(
            id = "mock-ref-1",
            lessonId = "lesson-1",
            title = "Configuring Interfaces",
            summaryText = "Interfaces are the point of connection between two devices or networks. Proper configuration ensures connectivity.",
            keyPoints = listOf(
                "Interfaces must have an IP address and subnet mask.",
                "Use 'no shutdown' to enable the interface.",
                "Changes usually require privileged EXEC mode."
            ),
            codeSnippets = listOf(
                CodeSnippet("Enter Config Mode", "configure terminal"),
                CodeSnippet("Select Interface", "interface gigabitEthernet 0/0"),
                CodeSnippet("Set IP Address", "ip address 192.168.1.1 255.255.255.0"),
                CodeSnippet("Enable Interface", "no shutdown")
            )
        )
    }
    
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
                    slideInHorizontally { width -> width } + 
                        fadeIn() togetherWith
                        slideOutHorizontally { width -> -width } + 
                        fadeOut()
                } else {
                    // Previous: slide from left
                    slideInHorizontally { width -> -width } + 
                        fadeIn() togetherWith
                        slideOutHorizontally { width -> width } + 
                        fadeOut()
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
                                onIntent(PlayerIntent.Next)
                            } else if (dragAmount > 0 && canGoPrevious) {
                                // Swipe right -> Previous  
                                onIntent(PlayerIntent.Previous)
                            }
                        }
                    }
                },
        ) { screenIndex ->
            val screen = bundle.screens.getOrNull(screenIndex)
            if (screen != null) {
                PlayerContent(
                    screen = screen,
                    mediaAccessToken = mediaAccessToken,
                    activeHotspotHint = activeHotspotHint,
                    onIntent = onIntent,
                    resolveUrl = resolveUrl,
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
            ) + scaleIn(
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
            ) + scaleOut(
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
                onExit = { onIntent(PlayerIntent.ExitFullscreen) },
                onShowTheory = if (contextRef != null) {
                    { showTheorySheet = true }
                } else null,
                modifier = Modifier.padding(16.dp)
            )
        }
        
        // Theory Bottom Sheet
        if (showTheorySheet) {
            @OptIn(ExperimentalMaterial3Api::class)
            ModalBottomSheet(
                onDismissRequest = { showTheorySheet = false },
                sheetState = sheetState
            ) {
                LessonCheatSheetView(
                    reference = mockLessonReference
                )
            }
        }
        
        // Bottom controls with enhanced animations
        AnimatedVisibility(
            visible = controlsVisible,
            enter = fadeIn(
                animationSpec = androidx.compose.animation.core.tween(
                    durationMillis = 300,
                    easing = androidx.compose.animation.core.FastOutSlowInEasing
                )
            ) + slideInVertically(
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
            ) + slideOutVertically(
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
                onPreviousScreen = { onIntent(PlayerIntent.Previous) },
                onNextScreen = { onIntent(PlayerIntent.Next) },
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}
