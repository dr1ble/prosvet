package com.digitaledu.feature.home.impl.player

import com.digitaledu.core.model.CatalogBundle
import com.digitaledu.core.model.Hotspot

data class PlayerUiState(
    val bundle: CatalogBundle? = null,
    val currentScreenIndex: Int = 0,
    val isFullscreenMode: Boolean = false,
    val completedScreens: Set<Int> = emptySet(),
    val activeHotspotHint: Hotspot? = null,
) {
    val currentScreen
        get() = bundle?.screens?.getOrNull(currentScreenIndex)
    val canGoPrevious
        get() = bundle?.let { currentScreenIndex > 0 } ?: false
    val canGoNext
        get() = bundle?.let { currentScreenIndex < it.screens.lastIndex } ?: false
    val hasBundle
        get() = bundle != null
}
