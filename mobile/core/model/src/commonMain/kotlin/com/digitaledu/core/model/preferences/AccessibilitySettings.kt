package com.digitaledu.core.model.preferences

data class AccessibilitySettings(
    val fontScale: Float = 1.0f,
    val controlScale: Float = 1.0f,
    val boldText: Boolean = false,
    val highContrast: Boolean = false,
    val voiceSupport: Boolean = false,
    val tremorFilter: Boolean = false,
)
