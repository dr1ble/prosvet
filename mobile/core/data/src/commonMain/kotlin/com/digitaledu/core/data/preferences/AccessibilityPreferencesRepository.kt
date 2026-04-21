package com.digitaledu.core.data.preferences

import com.digitaledu.core.model.preferences.AccessibilitySettings
import kotlinx.coroutines.flow.Flow

interface AccessibilityPreferencesRepository {
    val settings: Flow<AccessibilitySettings>

    suspend fun update(transform: (AccessibilitySettings) -> AccessibilitySettings)
}
