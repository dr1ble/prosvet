package com.digitaledu.core.ui.util

import androidx.compose.runtime.Composable

@Composable
expect fun rememberErrorHapticFeedback(): () -> Unit
