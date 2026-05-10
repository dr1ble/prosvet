package com.digitaledu.feature.auth.impl

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
internal expect fun QrScannerViewport(
    onScanSuccess: (String) -> Unit,
    onScanError: (String) -> Unit,
    resetKey: Any = Unit,
    modifier: Modifier = Modifier,
)
