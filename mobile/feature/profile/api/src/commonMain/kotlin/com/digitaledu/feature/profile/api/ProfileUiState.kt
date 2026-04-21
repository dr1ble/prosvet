package com.digitaledu.feature.profile.api

import com.digitaledu.core.model.preferences.AccessibilitySettings

data class ProfileUiState(
    val status: ProfileStatus = ProfileStatus.Idle,
    val accessibilitySettings: AccessibilitySettings = AccessibilitySettings(),
)
