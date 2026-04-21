package com.digitaledu.core.data.preferences

import com.digitaledu.core.model.preferences.AccessibilitySettings
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class InMemoryAccessibilityPreferencesRepository(
    initial: AccessibilitySettings = AccessibilitySettings(),
) : AccessibilityPreferencesRepository {
    private val mutableSettings = MutableStateFlow(initial)

    override val settings: Flow<AccessibilitySettings> = mutableSettings.asStateFlow()

    override suspend fun update(transform: (AccessibilitySettings) -> AccessibilitySettings) {
        mutableSettings.update(transform)
    }
}
