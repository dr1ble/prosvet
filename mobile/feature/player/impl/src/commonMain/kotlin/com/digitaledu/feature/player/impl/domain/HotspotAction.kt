package com.digitaledu.feature.player.impl.domain

import com.digitaledu.core.model.content.Hotspot

internal sealed interface HotspotAction {
    data object MoveNext : HotspotAction
    data class ShowHint(val hotspot: Hotspot) : HotspotAction
    data class NavigateToScreen(val screenKey: String) : HotspotAction
    data object None : HotspotAction
}
