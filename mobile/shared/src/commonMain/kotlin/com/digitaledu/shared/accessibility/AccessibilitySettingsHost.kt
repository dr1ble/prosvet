package com.digitaledu.shared.accessibility

import com.digitaledu.core.model.preferences.AccessibilitySettings
import kotlinx.coroutines.flow.StateFlow

interface AccessibilitySettingsHost {
    val settings: StateFlow<AccessibilitySettings>

    fun update(transform: (AccessibilitySettings) -> AccessibilitySettings)
}
