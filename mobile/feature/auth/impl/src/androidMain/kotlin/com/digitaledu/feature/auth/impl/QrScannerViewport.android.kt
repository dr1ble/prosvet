package com.digitaledu.feature.auth.impl

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.barcode.common.Barcode.FORMAT_QR_CODE
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

@Composable
internal actual fun QrScannerViewport(
    onScanSuccess: (String) -> Unit,
    onScanError: (String) -> Unit,
    resetKey: Any,
    modifier: Modifier,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    val scannerOptions = remember {
        BarcodeScannerOptions.Builder()
            .setBarcodeFormats(FORMAT_QR_CODE)
            .build()
    }
    val barcodeScanner = remember { BarcodeScanning.getClient(scannerOptions) }
    val handledScan = remember(resetKey) { AtomicBoolean(false) }

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA,
            ) == PackageManager.PERMISSION_GRANTED,
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { granted ->
        hasCameraPermission = granted
        if (!granted) {
            onScanError("Для сканирования нужен доступ к камере")
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
            barcodeScanner.close()
        }
    }

    if (!hasCameraPermission) {
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Разрешите доступ к камере, чтобы сканировать QR-код",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Button(
                onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                modifier = Modifier
                    .fillMaxWidth()
                    .accessibilityTouchTarget
                    .accessibilitySemantics(
                        label = "Разрешить камеру",
                        role = Role.Button,
                    ),
            ) {
                Text("Разрешить камеру")
            }
        }
        return
    }

    val previewView = remember {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
        }
    }

    AndroidView(
        modifier = modifier.fillMaxSize(),
        factory = { previewView },
    )

    DisposableEffect(lifecycleOwner, hasCameraPermission) {
        if (!hasCameraPermission) {
            onDispose { }
        } else {
            val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
            val mainExecutor = ContextCompat.getMainExecutor(context)
            val listener = Runnable {
                val cameraProvider = cameraProviderFuture.get()

                val preview = Preview.Builder().build().also { builtPreview ->
                    builtPreview.surfaceProvider = previewView.surfaceProvider
                }

                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()

                analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                    val mediaImage = imageProxy.image
                    if (mediaImage == null) {
                        imageProxy.close()
                        return@setAnalyzer
                    }

                    val inputImage = InputImage.fromMediaImage(
                        mediaImage,
                        imageProxy.imageInfo.rotationDegrees,
                    )

                    barcodeScanner
                        .process(inputImage)
                        .addOnSuccessListener { barcodes ->
                            val authToken = barcodes
                                .firstNotNullOfOrNull { barcode ->
                                    extractAuthQrToken(barcode)
                                }
                            if (authToken != null && handledScan.compareAndSet(false, true)) {
                                onScanSuccess(authToken)
                                return@addOnSuccessListener
                            }

                            val token = barcodes
                                .firstNotNullOfOrNull { barcode ->
                                    extractGroupQrToken(barcode)
                                }

                            if (token != null && handledScan.compareAndSet(false, true)) {
                                dispatchTokenAsDeepLink(context, token)
                                onScanSuccess(token)
                            }
                        }
                        .addOnCompleteListener {
                            imageProxy.close()
                        }
                }

                try {
                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        preview,
                        analysis,
                    )
                } catch (_: Exception) {
                    onScanError("Не удалось запустить камеру")
                }
            }

            cameraProviderFuture.addListener(listener, mainExecutor)

            onDispose {
                runCatching {
                    cameraProviderFuture.get().unbindAll()
                }
            }
        }
    }
}

private fun extractAuthQrToken(barcode: Barcode): String? {
    val rawValue = barcode.rawValue?.trim().orEmpty()
    if (rawValue.isBlank()) {
        return null
    }

    val asUri = runCatching { Uri.parse(rawValue) }.getOrNull() ?: return null
    if (asUri.scheme != "digitaledu" || asUri.host != "auth") {
        return null
    }

    val segments = asUri.pathSegments
    val qrIndex = segments.indexOf("qr")
    if (qrIndex >= 0 && qrIndex + 1 < segments.size) {
        return segments[qrIndex + 1].takeIf { it.isNotBlank() }
    }
    return asUri.getQueryParameter("token")?.takeIf { it.isNotBlank() }
}

private fun extractGroupQrToken(barcode: Barcode): String? {
    val rawValue = barcode.rawValue?.trim().orEmpty()
    if (rawValue.isBlank()) {
        return null
    }

    val asUri = runCatching { Uri.parse(rawValue) }.getOrNull()
    if (asUri != null) {
        asUri.getQueryParameter("token")?.takeIf { it.isNotBlank() }?.let { return it }

        if (asUri.scheme == "digitaledu" && asUri.host == "group") {
            val segments = asUri.pathSegments
            val joinIndex = segments.indexOf("join")
            if (joinIndex >= 0 && joinIndex + 1 < segments.size) {
                return segments[joinIndex + 1]
            }
        }
    }

    return rawValue
}

private fun dispatchTokenAsDeepLink(context: android.content.Context, token: String) {
    val deepLinkUri = Uri.parse("digitaledu://group/join?token=${Uri.encode(token)}")
    val deepLinkIntent = Intent(Intent.ACTION_VIEW, deepLinkUri).apply {
        addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }

    runCatching {
        context.startActivity(deepLinkIntent)
    }
}
