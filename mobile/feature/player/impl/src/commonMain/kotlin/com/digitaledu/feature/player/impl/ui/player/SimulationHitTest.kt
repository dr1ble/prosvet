package com.digitaledu.feature.player.impl.ui.player

import com.digitaledu.core.model.content.Hotspot
import kotlin.math.roundToInt

internal data class HotspotBounds(
    val x: Int,
    val y: Int,
    val width: Int,
    val height: Int,
)

internal fun calculateHotspotBounds(
    hotspot: Hotspot,
    imageWidth: Int,
    imageHeight: Int,
): HotspotBounds {
    return HotspotBounds(
        x = (imageWidth * hotspot.x / 100f).roundToInt(),
        y = (imageHeight * hotspot.y / 100f).roundToInt(),
        width = (imageWidth * hotspot.width / 100f).roundToInt(),
        height = (imageHeight * hotspot.height / 100f).roundToInt(),
    )
}

internal fun isPointInsideHotspot(
    hotspot: Hotspot,
    imageWidth: Int,
    imageHeight: Int,
    pointX: Int,
    pointY: Int,
): Boolean {
    val bounds = calculateHotspotBounds(hotspot, imageWidth, imageHeight)
    return pointX >= bounds.x &&
        pointX <= bounds.x + bounds.width &&
        pointY >= bounds.y &&
        pointY <= bounds.y + bounds.height
}
