package com.digitaledu.feature.player.api

import com.digitaledu.core.model.catalog.CatalogBundle
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

interface PlayerFeatureHost {
    val uiState: StateFlow<PlayerUiState>
    val effects: Flow<PlayerEffect>

    fun processIntent(intent: PlayerIntent)
    fun openBundle(bundle: CatalogBundle, startFullscreen: Boolean = false)
    fun resolveImageUrl(rawUrl: String): String
}
