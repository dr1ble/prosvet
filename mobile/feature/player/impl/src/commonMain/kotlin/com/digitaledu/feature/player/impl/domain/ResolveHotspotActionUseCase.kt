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
        val isStartSimulation = (currentPayload as? SimulationPayload)?.isStart == true
        if (isStartSimulation && targetScreenKey == null) {
            return HotspotAction.MoveNext
        }

        return when {
            hotspot.hint.isNotBlank() -> HotspotAction.ShowHint(hotspot)
            targetScreenKey != null -> HotspotAction.NavigateToScreen(targetScreenKey)
            else -> HotspotAction.None
        }
    }
}
