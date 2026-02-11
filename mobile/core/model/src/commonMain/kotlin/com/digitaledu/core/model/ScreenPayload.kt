package com.digitaledu.core.model

/**
 * Represents different types of screen content payloads.
 * 
 * This sealed interface allows type-safe handling of different content types
 * (simulation, text, video, etc.) while maintaining a common interface.
 */
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonClassDiscriminator

/**
 * Represents different types of screen content payloads.
 * 
 * This sealed interface allows type-safe handling of different content types
 * (simulation, text, video, etc.) while maintaining a common interface.
 */
@Serializable
@JsonClassDiscriminator("type")
sealed interface ScreenPayload {
    /**
     * Interactive simulation with clickable hotspots.
     */
    @Serializable
    @SerialName("simulation")
    data class Simulation(
        @SerialName("image_url") val imageUrl: String,
        val hotspots: List<Hotspot> = emptyList(),
        @SerialName("is_start") val isStart: Boolean = false,
        @SerialName("is_completion") val isCompletion: Boolean = false,
        @SerialName("context_ref") val contextRef: String? = null // Link to specific section in Article/Reference
    ) : ScreenPayload

    /**
     * Video lecture with optional transcript.
     */
    @Serializable
    @SerialName("video")
    data class Video(
        @SerialName("video_url") val videoUrl: String,
        @SerialName("duration_sec") val durationSec: Long,
        val transcript: String? = null
    ) : ScreenPayload

    /**
     * Rich text article (lesson notes) using Markdown.
     */
    @Serializable
    @SerialName("article")
    data class Article(
        @SerialName("markdown_content") val markdownContent: String,
        val assets: List<String> = emptyList()
    ) : ScreenPayload

    /**
     * Assessment/Quiz screen.
     */
    @Serializable
    @SerialName("quiz")
    data class Quiz(
        val questions: List<QuizQuestion>
    ) : ScreenPayload

    /**
     * Cheat Sheet / Lesson Reference screen.
     */
    @Serializable
    @SerialName("cheat_sheet")
    data class CheatSheet(
        @SerialName("reference_id") val referenceId: String
    ) : ScreenPayload
    
    /**
     * Unknown or unsupported payload type.
     */
    @Serializable
    @SerialName("unknown")
    data class Unknown(val raw: String) : ScreenPayload
}

/**
 * Interactive hotspot zone in a simulation.
 * 
 * Coordinates and dimensions are percentages (0-100) relative to the image size.
 * Example: x=50, y=50, width=10, height=10 creates a 10%x10% box centered in the image.
 */
@Serializable
data class Hotspot(
    val x: Float,              // Percentage from left edge (0-100)
    val y: Float,              // Percentage from top edge (0-100)
    val width: Float,          // Width as percentage of image width (0-100)
    val height: Float,         // Height as percentage of image height (0-100)
    val label: String,         // Display name for the hotspot
    val hint: String,          // Tooltip/hint text shown on interaction
    @SerialName("target_screen_key") val targetScreenKey: String? = null, // Screen to navigate to when clicked (null = no navigation)
)
