package com.digitaledu.shared.accessibility

import androidx.compose.runtime.Stable
import com.digitaledu.core.data.preferences.AccessibilityPreferencesRepository
import com.digitaledu.core.model.preferences.AccessibilitySettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

@Stable
class AccessibilitySettingsHostImpl(
    private val repository: AccessibilityPreferencesRepository,
) : AccessibilitySettingsHost {

    private val scope = CoroutineScope(SupervisorJob())
    private val _settings = MutableStateFlow(AccessibilitySettings())

    override val settings: StateFlow<AccessibilitySettings> = _settings.asStateFlow()

    init {
        scope.launch {
            repository.settings.collect { settings ->
                _settings.value = settings
            }
        }
    }

    override fun update(transform: (AccessibilitySettings) -> AccessibilitySettings) {
        scope.launch {
            repository.update(transform)
        }
    }
}
