package com.digitaledu.mobile.accessibility

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.digitaledu.core.data.preferences.AccessibilityPreferencesRepository
import com.digitaledu.core.model.preferences.AccessibilitySettings
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.accessibilityDataStore by preferencesDataStore(name = "accessibility_preferences")

class AndroidAccessibilityPreferencesRepository(
    private val context: Context,
) : AccessibilityPreferencesRepository {

    override val settings: Flow<AccessibilitySettings> = context.accessibilityDataStore.data.map { preferences ->
        AccessibilitySettings(
            fontScale = preferences[FONT_SCALE_KEY] ?: 1.0f,
            controlScale = preferences[CONTROL_SCALE_KEY] ?: 1.0f,
            boldText = preferences[BOLD_TEXT_KEY] ?: false,
            highContrast = preferences[HIGH_CONTRAST_KEY] ?: false,
            voiceSupport = preferences[VOICE_SUPPORT_KEY] ?: false,
            tremorFilter = preferences[TREMOR_FILTER_KEY] ?: false,
        )
    }

    override suspend fun update(transform: (AccessibilitySettings) -> AccessibilitySettings) {
        context.accessibilityDataStore.edit { preferences ->
            val current = AccessibilitySettings(
                fontScale = preferences[FONT_SCALE_KEY] ?: 1.0f,
                controlScale = preferences[CONTROL_SCALE_KEY] ?: 1.0f,
                boldText = preferences[BOLD_TEXT_KEY] ?: false,
                highContrast = preferences[HIGH_CONTRAST_KEY] ?: false,
                voiceSupport = preferences[VOICE_SUPPORT_KEY] ?: false,
                tremorFilter = preferences[TREMOR_FILTER_KEY] ?: false,
            )
            val updated = transform(current)
            preferences[FONT_SCALE_KEY] = updated.fontScale.coerceIn(1.0f, 1.6f)
            preferences[CONTROL_SCALE_KEY] = updated.controlScale.coerceIn(1.0f, 1.3f)
            preferences[BOLD_TEXT_KEY] = updated.boldText
            preferences[HIGH_CONTRAST_KEY] = updated.highContrast
            preferences[VOICE_SUPPORT_KEY] = updated.voiceSupport
            preferences[TREMOR_FILTER_KEY] = updated.tremorFilter
        }
    }

    private companion object {
        val FONT_SCALE_KEY = floatPreferencesKey("font_scale")
        val CONTROL_SCALE_KEY = floatPreferencesKey("control_scale")
        val BOLD_TEXT_KEY = booleanPreferencesKey("bold_text")
        val HIGH_CONTRAST_KEY = booleanPreferencesKey("high_contrast")
        val VOICE_SUPPORT_KEY = booleanPreferencesKey("voice_support")
        val TREMOR_FILTER_KEY = booleanPreferencesKey("tremor_filter")
    }
}
