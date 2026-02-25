package com.digitaledu.core.model.content

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
}
