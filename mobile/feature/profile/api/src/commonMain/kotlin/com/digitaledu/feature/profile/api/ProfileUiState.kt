package com.digitaledu.feature.profile.api

import com.digitaledu.core.model.preferences.AccessibilitySettings
import com.digitaledu.core.model.progress.CourseProgressInfo

data class ProfileUiState(
    val status: ProfileStatus = ProfileStatus.Idle,
    val accessibilitySettings: AccessibilitySettings = AccessibilitySettings(),
    val displayName: String? = null,
    val role: String? = null,
    val accountStatus: String? = null,
    val permissions: List<String> = emptyList(),
    val courseProgress: List<CourseProgressInfo> = emptyList(),
    val isLoadingProgress: Boolean = false,
)
