package com.digitaledu.feature.auth.impl

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.digitaledu.core.ui.components.AuthHeader
import com.digitaledu.core.ui.components.AuthUiOpacity
import com.digitaledu.core.ui.components.AuthUiShapes
import com.digitaledu.core.ui.components.AuthUiSize
import com.digitaledu.core.ui.components.AuthUiSpacing
import com.digitaledu.core.ui.components.AuthUiStroke
import com.digitaledu.core.ui.components.AuthUiTypography
import com.digitaledu.core.ui.components.ErrorDialog
import com.digitaledu.core.ui.components.accessibilitySemantics
import com.digitaledu.core.ui.components.accessibilityTouchTarget
import digital_education_mobile.feature.auth.`impl`.generated.resources.Res
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_qr_action_manual
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_qr_instruction
import digital_education_mobile.feature.auth.`impl`.generated.resources.auth_qr_scan_title
import org.jetbrains.compose.resources.stringResource

@Composable
internal fun QrLoginScreen(
    uiState: AuthUiState,
    onBack: () -> Unit,
    onManualLogin: () -> Unit,
    onIntent: (AuthIntent) -> Unit,
    modifier: Modifier = Modifier,
) {
    var scanStatus by rememberSaveable { mutableStateOf<String?>(null) }
    var scanError by rememberSaveable { mutableStateOf<String?>(null) }
    var scannerResetKey by rememberSaveable { mutableStateOf(0) }

    val viewModelError = uiState.errorMessage
    val displayError = scanError ?: viewModelError

    // When the view-model stopped processing and no error is shown, clear the
    // "Выполняем вход…" status so it doesn't stick on the screen after
    // success (nav transition) or an already-dismissed error.
    LaunchedEffect(uiState.isSubmitting, displayError) {
        if (!uiState.isSubmitting && displayError == null) {
            scanStatus = null
        }
    }

    ErrorDialog(
        message = displayError,
        onDismiss = {
            if (scanError != null) {
                scanError = null
            }
            if (viewModelError != null) {
                onIntent(AuthIntent.DismissError)
            }
            scanStatus = null
            scannerResetKey += 1
        },
    )

    Scaffold(
        modifier = modifier,
        containerColor = MaterialTheme.colorScheme.surface,
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter),
                color = MaterialTheme.colorScheme.surface.copy(alpha = AuthUiOpacity.headerSurface),
            ) {
                AuthHeader(
                    title = stringResource(Res.string.auth_qr_scan_title),
                    onBackClick = onBack,
                    titleColor = MaterialTheme.colorScheme.onSurface,
                    iconTint = MaterialTheme.colorScheme.primary,
                    centerTitle = true,
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = AuthUiSize.buttonHeight),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Box(
                    modifier = Modifier.size(AuthUiSize.scannerSize),
                ) {
                    QrScannerViewport(
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(AuthUiShapes.cardLg),
                        resetKey = scannerResetKey,
                        onScanSuccess = {
                            scanError = null
                            scanStatus = "QR-код распознан. Выполняем вход…"
                            onIntent(AuthIntent.QrTokenScanned(it))
                        },
                        onScanError = { msg -> scanError = msg },
                    )

                    CornerBrackets(
                        bracketSize = AuthUiSize.scannerSize,
                        color = MaterialTheme.colorScheme.primary,
                        strokeWidth = AuthUiStroke.regular,
                        cornerLength = AuthUiSize.scannerCornerLength,
                    )

                    Box(
                        modifier = Modifier
                            .fillMaxWidth(0.84f)
                            .height(AuthUiStroke.thin)
                            .align(Alignment.Center)
                            .background(
                                brush = Brush.horizontalGradient(
                                    colors = listOf(
                                        Color.Transparent,
                                        MaterialTheme.colorScheme.primary,
                                        Color.Transparent,
                                    ),
                                ),
                            ),
                    )
                }

                Spacer(modifier = Modifier.height(AuthUiSpacing.sectionXl))

                Text(
                    text = stringResource(Res.string.auth_qr_instruction),
                    fontWeight = FontWeight.Medium,
                    style = AuthUiTypography.bodyLg,
                    color = MaterialTheme.colorScheme.onSurface,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = AuthUiSpacing.sectionLg),
                )

                scanStatus?.let {
                    Spacer(modifier = Modifier.height(AuthUiSpacing.itemMd))
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.onSurface,
                        style = AuthUiTypography.labelMd,
                        textAlign = TextAlign.Center,
                    )
                }
                Spacer(modifier = Modifier.height(AuthUiSpacing.sectionXl))

                Button(
                    onClick = onManualLogin,
                    modifier = Modifier
                        .padding(horizontal = AuthUiSpacing.sectionLg)
                        .accessibilityTouchTarget
                        .accessibilitySemantics(
                            label = stringResource(Res.string.auth_qr_action_manual),
                            role = Role.Button,
                        ),
                    shape = AuthUiShapes.pill,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                    contentPadding = PaddingValues(
                        horizontal = AuthUiSpacing.sectionLg,
                        vertical = AuthUiSpacing.contentPadding,
                    ),
                ) {
                    Icon(
                        imageVector = Icons.Filled.EditNote,
                        contentDescription = null,
                        modifier = Modifier.size(AuthUiSize.iconMd),
                    )
                    Spacer(modifier = Modifier.width(AuthUiSpacing.itemSm))
                    Text(
                        text = stringResource(Res.string.auth_qr_action_manual),
                        fontWeight = FontWeight.Medium,
                        style = AuthUiTypography.bodyLg,
                    )
                }
            }
        }
    }
}

@Composable
private fun CornerBrackets(
    bracketSize: Dp,
    color: Color,
    strokeWidth: Dp,
    cornerLength: Dp,
) {
    Box(modifier = Modifier.size(bracketSize)) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .drawBehind {
                    val sw = strokeWidth.toPx()
                    val cl = cornerLength.toPx()
                    val w = bracketSize.toPx()
                    val h = bracketSize.toPx()
                    val cap = StrokeCap.Round

                    drawLine(color, Offset(0f, cl), Offset(0f, 0f), sw, cap)
                    drawLine(color, Offset(0f, 0f), Offset(cl, 0f), sw, cap)
                    drawLine(color, Offset(w - cl, 0f), Offset(w, 0f), sw, cap)
                    drawLine(color, Offset(w, 0f), Offset(w, cl), sw, cap)
                    drawLine(color, Offset(0f, h - cl), Offset(0f, h), sw, cap)
                    drawLine(color, Offset(0f, h), Offset(cl, h), sw, cap)
                    drawLine(color, Offset(w - cl, h), Offset(w, h), sw, cap)
                    drawLine(color, Offset(w, h - cl), Offset(w, h), sw, cap)
                },
        )
    }
}
