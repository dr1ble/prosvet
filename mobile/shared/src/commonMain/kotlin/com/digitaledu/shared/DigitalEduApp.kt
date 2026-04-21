package com.digitaledu.shared

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import com.digitaledu.core.designsystem.theme.DigitalEduTheme
import com.digitaledu.core.ui.components.ProvideAccessibilityUiState
import com.digitaledu.feature.root.impl.RootRoute
import com.digitaledu.shared.accessibility.AccessibilitySettingsHost
import org.koin.mp.KoinPlatform

@Composable
fun DigitalEduApp(
    initialGroupQrToken: String? = null,
    onGroupQrTokenConsumed: () -> Unit = {},
) {
    val accessibilitySettingsHost = KoinPlatform.getKoin().get<AccessibilitySettingsHost>()
    val accessibilitySettings by accessibilitySettingsHost.settings.collectAsState()

    DigitalEduTheme(
        highContrast = accessibilitySettings.highContrast,
        fontScale = accessibilitySettings.fontScale,
        boldText = accessibilitySettings.boldText,
    ) {
        ProvideAccessibilityUiState(
            controlScale = accessibilitySettings.controlScale,
            voiceSupport = accessibilitySettings.voiceSupport,
            tremorFilter = accessibilitySettings.tremorFilter,
        ) {
            RootRoute(
                initialGroupQrToken = initialGroupQrToken,
                onGroupQrTokenConsumed = onGroupQrTokenConsumed,
                modifier = Modifier,
            )
        }
    }
}
