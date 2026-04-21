package com.digitaledu.feature.auth.impl

import com.digitaledu.core.model.auth.DebugQuickLoginPreset

data class DebugQuickLoginConfig(
    val enabled: Boolean = false,
    val presets: List<DebugQuickLoginPreset> = emptyList(),
)
