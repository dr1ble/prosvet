package com.digitaledu.feature.player.impl.ui.player

import com.digitaledu.core.model.content.SimulationPayload
import kotlin.math.roundToInt

internal data class CyberTrainerState(
    val isEnabled: Boolean,
    val totalSignals: Int,
    val discoveredSignals: Int,
    val progressPercent: Int,
    val isComplete: Boolean,
)

internal fun buildCyberTrainerState(
    screenTitle: String,
    payload: SimulationPayload,
    discoveredLabels: Set<String>,
): CyberTrainerState {
    val normalizedTitle = screenTitle.lowercase()
    val isCyberSimulation = listOf("подозр", "мошен", "безопас", "кибер", "scam").any { marker ->
        marker in normalizedTitle
    }
    val signalLabels = payload.hotspots
        .map { hotspot -> hotspot.label.trim() }
        .filter { label -> label.isNotEmpty() }
        .distinct()
    val totalSignals = signalLabels.size
    val discoveredSignals = signalLabels.count { label -> label in discoveredLabels }
    val progressPercent = if (totalSignals == 0) {
        0
    } else {
        (discoveredSignals.toFloat() / totalSignals.toFloat() * 100).roundToInt().coerceIn(0, 100)
    }

    return CyberTrainerState(
        isEnabled = isCyberSimulation && totalSignals > 0,
        totalSignals = totalSignals,
        discoveredSignals = discoveredSignals,
        progressPercent = progressPercent,
        isComplete = totalSignals > 0 && discoveredSignals == totalSignals,
    )
}
