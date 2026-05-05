package com.digitaledu.feature.profile.impl.ui

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import java.io.File

@Composable
internal actual fun AvatarUploadPicker(
    enabled: Boolean,
    isUploading: Boolean,
    onUploadAvatar: (String, String, ByteArray) -> Unit,
    modifier: Modifier,
) {
    val context = LocalContext.current
    val cropOutputUriState = remember { mutableStateOf<Uri?>(null) }
    val cropOutputFileState = remember { mutableStateOf<File?>(null) }

    fun uploadFromUri(uri: Uri) {
        val resolver = context.contentResolver
        val contentType = resolver.getType(uri) ?: "image/png"
        val extension = when (contentType) {
            "image/jpeg" -> "jpg"
            "image/webp" -> "webp"
            else -> "png"
        }
        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: return
        onUploadAvatar("avatar.$extension", contentType, bytes)
    }

    val cropLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        val outputUri = cropOutputUriState.value
        if (outputUri != null) {
            uploadFromUri(outputUri)
        }
        cropOutputUriState.value = null
        cropOutputFileState.value?.delete()
        cropOutputFileState.value = null
    }

    val pickerLauncher = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult

        val outputDir = File(context.cacheDir, "images").apply { mkdirs() }
        val outputFile = File(outputDir, "avatar-crop-${System.currentTimeMillis()}.jpg")
        val outputUri = FileProvider.getUriForFile(
            context,
            "com.digitaledu.mobile.fileprovider",
            outputFile,
        )

        val cropIntent = Intent("com.android.camera.action.CROP").apply {
            setDataAndType(uri, "image/*")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            putExtra("crop", "true")
            putExtra("scale", true)
            putExtra("scaleUpIfNeeded", true)
            putExtra("aspectX", 1)
            putExtra("aspectY", 1)
            putExtra("outputX", 1024)
            putExtra("outputY", 1024)
            putExtra("return-data", false)
            putExtra(android.provider.MediaStore.EXTRA_OUTPUT, outputUri)
            putExtra("outputFormat", android.graphics.Bitmap.CompressFormat.JPEG.toString())
            clipData = android.content.ClipData.newRawUri("avatar", uri)
        }

        val canCrop = cropIntent.resolveActivity(context.packageManager) != null
        if (canCrop) {
            cropOutputUriState.value = outputUri
            cropOutputFileState.value = outputFile
            context.grantUriPermission(
                cropIntent.resolveActivity(context.packageManager)?.packageName,
                outputUri,
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION,
            )
            cropLauncher.launch(cropIntent)
        } else {
            uploadFromUri(uri)
        }
    }

    Button(
        onClick = {
            pickerLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        },
        enabled = enabled,
        modifier = modifier,
    ) {
        if (isUploading) {
            CircularProgressIndicator()
        } else {
            Text("Загрузить и обрезать фото")
        }
    }
}
