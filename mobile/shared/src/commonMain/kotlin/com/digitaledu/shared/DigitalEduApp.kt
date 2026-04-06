package com.digitaledu.shared

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.digitaledu.feature.root.impl.RootRoute

@Composable
fun DigitalEduApp(
    initialGroupQrToken: String? = null,
    onGroupQrTokenConsumed: () -> Unit = {},
) {
    RootRoute(
        initialGroupQrToken = initialGroupQrToken,
        onGroupQrTokenConsumed = onGroupQrTokenConsumed,
        modifier = Modifier,
    )
}
