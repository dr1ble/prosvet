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
     * 
     * Used for step-by-step guided simulations where users click on specific
     * areas of an image to progress through the lesson.
     */
    data class Simulation(
        val imageUrl: String,
        val hotspots: List<Hotspot>,
        val isStart: Boolean = false,
        val isCompletion: Boolean = false,
    ) : ScreenPayload
    
    /**
     * Unknown or unsupported payload type.
     * 
     * Contains the raw JSON string for debugging or future compatibility.
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
