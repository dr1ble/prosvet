package com.digitaledu.feature.player.api

import com.digitaledu.core.model.content.Hotspot

sealed interface PlayerIntent {
    data object Next : PlayerIntent
    data object Previous : PlayerIntent
    data class NavigateToScreen(val screenKey: String) : PlayerIntent
    data class ClickHotspot(val hotspot: Hotspot) : PlayerIntent
    data object DismissHotspotHint : PlayerIntent
    data object EnterFullscreen : PlayerIntent
    data object ExitFullscreen : PlayerIntent
    data object Close : PlayerIntent
}
