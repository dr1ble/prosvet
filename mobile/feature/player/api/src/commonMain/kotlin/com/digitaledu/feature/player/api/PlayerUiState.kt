package com.digitaledu.feature.player.api

import com.digitaledu.core.model.catalog.CatalogBundle
import com.digitaledu.core.model.content.Hotspot

data class PlayerUiState(
    val bundle: CatalogBundle? = null,
    val currentScreenIndex: Int = 0,
    val isFullscreenMode: Boolean = false,
    val mediaAccessToken: String? = null,
    val completedScreens: Set<Int> = emptySet(),
    val activeHotspotHint: Hotspot? = null,
    val currentMemoId: String? = null,
    val isCurrentMemoSaved: Boolean = false,
    val showLessonSummary: Boolean = false,
    val showCourseContents: Boolean = false,
    val courseDetailsRevision: Int = 0,
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
