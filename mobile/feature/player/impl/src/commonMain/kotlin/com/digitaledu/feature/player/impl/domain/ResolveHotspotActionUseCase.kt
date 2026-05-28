package com.digitaledu.feature.player.impl.domain

import com.digitaledu.core.model.content.Hotspot
import com.digitaledu.core.model.content.ScreenPayload
import com.digitaledu.core.model.content.SimulationPayload

internal class ResolveHotspotActionUseCase {
    operator fun invoke(
        currentPayload: ScreenPayload?,
        hotspot: Hotspot,
    ): HotspotAction {
        val targetScreenKey = hotspot.targetScreenKey
        val simulationPayload = currentPayload as? SimulationPayload
        val isStartSimulation = simulationPayload?.isStart == true
        val fallbackTargetHotspot = simulationPayload?.hotspots?.firstOrNull()

        if (simulationPayload != null && targetScreenKey != null) {
            return HotspotAction.NavigateToScreen(targetScreenKey)
        }

        if (isStartSimulation && targetScreenKey == null && hotspot == fallbackTargetHotspot) {
            return HotspotAction.MoveNext
        }

        return when {
            hotspot.hint.isNotBlank() -> HotspotAction.ShowHint(hotspot)
            targetScreenKey != null -> HotspotAction.NavigateToScreen(targetScreenKey)
            else -> HotspotAction.None
        }
    }
}
