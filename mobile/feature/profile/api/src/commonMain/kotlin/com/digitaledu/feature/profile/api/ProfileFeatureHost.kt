package com.digitaledu.feature.profile.api

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

interface ProfileFeatureHost {
    val uiState: StateFlow<ProfileUiState>
    val effects: Flow<ProfileEffect>

    fun processIntent(intent: ProfileIntent)
}
