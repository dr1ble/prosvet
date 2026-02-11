package com.digitaledu.core.model

/**
 * Represents different types of screen content payloads.
 * 
 * This sealed interface allows type-safe handling of different content types
 * (simulation, text, video, etc.) while maintaining a common interface.
 */
sealed interface ScreenPayload {
    /**
     * Interactive simulation with clickable hotspots.
     */
    data class Simulation(
        val imageUrl: String,
        val hotspots: List<Hotspot>,
        val isStart: Boolean = false,
        val isCompletion: Boolean = false,
        val contextRef: String? = null // Link to specific section in Article/Reference
    ) : ScreenPayload

    /**
     * Video lecture with optional transcript.
     */
    data class Video(
        val videoUrl: String,
        val durationSec: Long,
        val transcript: String? = null
    ) : ScreenPayload

    /**
     * Rich text article (lesson notes) using Markdown.
     */
    data class Article(
        val markdownContent: String,
        val assets: List<String> = emptyList()
    ) : ScreenPayload

    /**
     * Assessment/Quiz screen.
     */
    data class Quiz(
        val questions: List<QuizQuestion>
    ) : ScreenPayload
    
    /**
     * Unknown or unsupported payload type.
     */
    data class Unknown(val raw: String) : ScreenPayload
}

/**
 * Interactive hotspot zone in a simulation.
 * 
 * Coordinates and dimensions are percentages (0-100) relative to the image size.
 * Example: x=50, y=50, width=10, height=10 creates a 10%x10% box centered in the image.
 */
data class Hotspot(
    val x: Float,              // Percentage from left edge (0-100)
    val y: Float,              // Percentage from top edge (0-100)
    val width: Float,          // Width as percentage of image width (0-100)
    val height: Float,         // Height as percentage of image height (0-100)
    val label: String,         // Display name for the hotspot
    val hint: String,          // Tooltip/hint text shown on interaction
    val targetScreenKey: String?, // Screen to navigate to when clicked (null = no navigation)
)
