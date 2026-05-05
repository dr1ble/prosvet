package com.digitaledu.feature.profile.impl.ui

import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
internal actual fun AvatarUploadPicker(
    enabled: Boolean,
    isUploading: Boolean,
    onUploadAvatar: (String, String, ByteArray) -> Unit,
    modifier: Modifier,
) {
    Button(onClick = {}, enabled = false, modifier = modifier) {
        Text("Загрузка фото доступна на Android")
    }
}
